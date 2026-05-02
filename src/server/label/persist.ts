import { TRPCError } from "@trpc/server";
import { LabelType, type PrismaClient } from "@/generated/prisma/client";
import { parseLabelFieldsJson } from "@/lib/label-field-config";
import { getObjectPresignedUrl, putObject } from "@/lib/s3";
import { renderLabelPdfBytes } from "@/server/label/render-pdf";
import {
  type BinTokenContext,
  buildBinVars,
  buildPalletVars,
  buildProductVars,
  type PalletTokenContext,
  type ProductTokenContext,
  resolveLabelTokens,
} from "@/server/label/token-context";
import {
  binLocationZpl,
  palletZpl,
  productBarcodeZpl,
} from "@/server/label/zpl";

export function extractS3KeyFromStoredUrl(pdfUrl: string): string | null {
  const m = pdfUrl.match(/^s3:\/\/[^/]+\/(.+)$/);
  return m?.[1] ?? null;
}

export async function presignPdfUrl(pdfUrl: string): Promise<string> {
  const key = extractS3KeyFromStoredUrl(pdfUrl);
  if (!key) {
    return pdfUrl;
  }
  return getObjectPresignedUrl({ key, expiresInSeconds: 3600 });
}

async function getTemplateOrThrow(
  db: PrismaClient,
  accountId: string,
  templateId: string,
): Promise<{
  id: string;
  widthMm: number;
  heightMm: number;
  fields: unknown;
  logoUrl: string | null;
}> {
  const template = await db.labelTemplate.findFirst({
    where: { id: templateId, accountId },
  });
  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Label template not found.",
    });
  }
  return template;
}

export async function getDefaultTemplate(
  db: PrismaClient,
  accountId: string,
  type: LabelType,
) {
  return db.labelTemplate.findFirst({
    where: { accountId, type, isDefault: true },
  });
}

export async function generateProductLabelAndPersist(args: {
  db: PrismaClient;
  accountId: string;
  productId: string;
  templateId?: string;
}): Promise<{
  id: string;
  pdfUrl: string;
  viewUrl: string;
  zplContent: string | null;
}> {
  const product = await args.db.product.findFirst({
    where: { id: args.productId, accountId: args.accountId },
    include: { merchant: { select: { name: true } } },
  });
  if (!product) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
  }

  const templateRow = args.templateId
    ? await getTemplateOrThrow(args.db, args.accountId, args.templateId)
    : await getDefaultTemplate(
        args.db,
        args.accountId,
        LabelType.PRODUCT_BARCODE,
      );
  if (!templateRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "No product label template found. Create a default PRODUCT_BARCODE template first.",
    });
  }

  const fields = parseLabelFieldsJson(templateRow.fields);
  const ctx: ProductTokenContext = { product };
  const vars = buildProductVars(ctx);

  const zpl = productBarcodeZpl({ sku: product.sku, name: product.name });

  return persistPdf({
    db: args.db,
    accountId: args.accountId,
    templateId: templateRow.id,
    widthMm: templateRow.widthMm,
    heightMm: templateRow.heightMm,
    fields,
    logoUrl: templateRow.logoUrl,
    resolve: (f) => resolveLabelTokens(f.content, vars),
    s3Key: `${args.accountId}/product-labels/${args.productId}.pdf`,
    referenceId: args.productId,
    referenceType: "PRODUCT",
    zpl,
  });
}

export async function generateBinLabelAndPersist(args: {
  db: PrismaClient;
  accountId: string;
  binId: string;
  templateId?: string;
}): Promise<{
  id: string;
  pdfUrl: string;
  viewUrl: string;
  zplContent: string | null;
}> {
  const bin = await args.db.bin.findFirst({
    where: {
      id: args.binId,
      zone: { warehouse: { accountId: args.accountId } },
    },
    include: {
      zone: { select: { code: true, name: true } },
      warehouse: { select: { name: true, code: true } },
    },
  });
  if (!bin) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Bin not found." });
  }

  const templateRow = args.templateId
    ? await getTemplateOrThrow(args.db, args.accountId, args.templateId)
    : await getDefaultTemplate(args.db, args.accountId, "BIN_LOCATION");
  if (!templateRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "No bin label template found. Create a default BIN_LOCATION template first.",
    });
  }

  const fields = parseLabelFieldsJson(templateRow.fields);
  const ctx: BinTokenContext = { bin };
  const vars = buildBinVars(ctx);
  const zpl = binLocationZpl({
    binLabel: bin.label,
    zoneCode: bin.zone.code,
  });

  return persistPdf({
    db: args.db,
    accountId: args.accountId,
    templateId: templateRow.id,
    widthMm: templateRow.widthMm,
    heightMm: templateRow.heightMm,
    fields,
    logoUrl: templateRow.logoUrl,
    resolve: (f) => resolveLabelTokens(f.content, vars),
    s3Key: `${args.accountId}/bin-labels/${args.binId}.pdf`,
    referenceId: args.binId,
    referenceType: "BIN",
    zpl,
  });
}

export async function generatePalletLabelAndPersist(args: {
  db: PrismaClient;
  accountId: string;
  purchaseOrderId: string;
  palletCode?: string;
  templateId?: string;
}): Promise<{
  id: string;
  pdfUrl: string;
  viewUrl: string;
  zplContent: string | null;
}> {
  const po = await args.db.purchaseOrder.findFirst({
    where: { id: args.purchaseOrderId, accountId: args.accountId },
    include: {
      merchant: { select: { name: true } },
      warehouse: { select: { name: true, code: true } },
    },
  });
  if (!po) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Purchase order not found.",
    });
  }

  const palletRef = args.palletCode
    ? `${args.purchaseOrderId}:${args.palletCode}`
    : args.purchaseOrderId;

  const templateRow = args.templateId
    ? await getTemplateOrThrow(args.db, args.accountId, args.templateId)
    : await getDefaultTemplate(args.db, args.accountId, "PALLET");
  if (!templateRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "No pallet label template found. Create a default PALLET template first.",
    });
  }

  const fields = parseLabelFieldsJson(templateRow.fields);
  const ctx: PalletTokenContext = { po, palletRef };
  const vars = buildPalletVars(ctx);
  const zpl = palletZpl({
    poNumber: po.poNumber,
    palletId: palletRef,
  });

  return persistPdf({
    db: args.db,
    accountId: args.accountId,
    templateId: templateRow.id,
    widthMm: templateRow.widthMm,
    heightMm: templateRow.heightMm,
    fields,
    logoUrl: templateRow.logoUrl,
    resolve: (f) => resolveLabelTokens(f.content, vars),
    s3Key: `${args.accountId}/pallet-labels/${palletRef.replace(/[^a-zA-Z0-9-_.]/g, "_")}.pdf`,
    referenceId: palletRef,
    referenceType: "PALLET",
    zpl,
  });
}

async function persistPdf(args: {
  db: PrismaClient;
  accountId: string;
  templateId: string;
  widthMm: number;
  heightMm: number;
  fields: ReturnType<typeof parseLabelFieldsJson>;
  logoUrl: string | null;
  resolve: (field: (typeof args.fields)[number]) => string;
  s3Key: string;
  referenceId: string;
  referenceType: string;
  zpl: string;
}): Promise<{
  id: string;
  pdfUrl: string;
  viewUrl: string;
  zplContent: string | null;
}> {
  const pdfBytes = await renderLabelPdfBytes({
    widthMm: args.widthMm,
    heightMm: args.heightMm,
    fields: args.fields,
    logoUrl: args.logoUrl,
    resolveField: (f) => {
      if (f.type === "logo" && f.content.trim() === "" && args.logoUrl) {
        return args.logoUrl;
      }
      return args.resolve(f);
    },
  });

  let pdfUrl: string;
  try {
    const up = await putObject({
      key: args.s3Key,
      body: Buffer.from(pdfBytes),
      contentType: "application/pdf",
    });
    pdfUrl = up.url;
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Could not upload label PDF. Configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.",
    });
  }

  const row = await args.db.generatedLabel.create({
    data: {
      accountId: args.accountId,
      templateId: args.templateId,
      referenceId: args.referenceId,
      referenceType: args.referenceType,
      pdfUrl,
      zplContent: args.zpl,
    },
  });

  const viewUrl = await presignPdfUrl(pdfUrl);
  return {
    id: row.id,
    pdfUrl: row.pdfUrl,
    viewUrl,
    zplContent: row.zplContent,
  };
}

export async function tryGenerateDefaultProductLabel(
  db: PrismaClient,
  accountId: string,
  productId: string,
): Promise<void> {
  const template = await getDefaultTemplate(db, accountId, "PRODUCT_BARCODE");
  if (!template) {
    return;
  }
  try {
    await generateProductLabelAndPersist({
      db,
      accountId,
      productId,
      templateId: template.id,
    });
  } catch {
    // Intentionally swallow — product creation must succeed without labels.
  }
}
