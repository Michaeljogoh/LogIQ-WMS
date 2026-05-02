import BwipJs from "bwip-js/node";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { LabelFieldConfig } from "@/lib/label-field-config";

const MM_TO_PT = 2.834645669;

export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function yTopToPdfBottom(
  pageHeight: number,
  yFromTop: number,
  boxHeight: number,
): number {
  return pageHeight - yFromTop - boxHeight;
}

function mapBcid(format: string | undefined): string {
  const f = (format ?? "code128").toLowerCase();
  if (f === "code128" || f === "code128raw") {
    return "code128";
  }
  if (f === "qrcode" || f === "qr") {
    return "qrcode";
  }
  if (f === "ean13" || f === "ean-13") {
    return "ean13";
  }
  return f;
}

export async function renderLabelPdfBytes(args: {
  widthMm: number;
  heightMm: number;
  fields: LabelFieldConfig[];
  resolveField: (field: LabelFieldConfig) => string;
  logoUrl: string | null;
}): Promise<Uint8Array> {
  const pageW = mmToPt(args.widthMm);
  const pageH = mmToPt(args.heightMm);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageW, pageH]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const field of args.fields) {
    const value = args.resolveField(field);

    if (field.type === "line") {
      const yLine = pageH - field.y;
      page.drawLine({
        start: { x: field.x, y: yLine },
        end: { x: field.x + field.width, y: yLine },
        thickness: Math.max(1, field.height || 1),
        color: rgb(0, 0, 0),
      });
      continue;
    }

    if (field.type === "text") {
      const size = field.fontSize ?? 10;
      const baseline = pageH - field.y - size;
      page.drawText(value, {
        x: field.x,
        y: Math.max(0, baseline),
        size,
        font: fontBold,
        color: rgb(0, 0, 0),
        maxWidth: field.width > 0 ? field.width : undefined,
      });
      continue;
    }

    if (field.type === "barcode" || field.type === "qr") {
      const bcid = mapBcid(field.barcodeFormat);
      let png: Buffer;
      try {
        png = await BwipJs.toBuffer({
          bcid: field.type === "qr" ? "qrcode" : bcid,
          text: value,
          scale: 3,
          height: 10,
          includetext: field.type === "barcode",
        });
      } catch {
        png = await BwipJs.toBuffer({
          bcid: "code128",
          text: value.slice(0, 40) || "0",
          scale: 2,
          height: 8,
          includetext: true,
        });
      }
      const img = await pdf.embedPng(png);
      const w = field.width > 0 ? field.width : img.width;
      const h = field.height > 0 ? field.height : img.height;
      const yBottom = yTopToPdfBottom(pageH, field.y, h);
      page.drawImage(img, {
        x: field.x,
        y: yBottom,
        width: w,
        height: h,
      });
      continue;
    }

    if (field.type === "logo") {
      const url = value || args.logoUrl;
      if (!url) {
        continue;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) {
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        let embedded: Awaited<ReturnType<typeof pdf.embedPng>>;
        try {
          embedded = await pdf.embedPng(buf);
        } catch {
          embedded = await pdf.embedJpg(buf);
        }
        const w = field.width > 0 ? field.width : embedded.width;
        const h = field.height > 0 ? field.height : embedded.height;
        const yBottom = yTopToPdfBottom(pageH, field.y, h);
        page.drawImage(embedded, {
          x: field.x,
          y: yBottom,
          width: w,
          height: h,
        });
      } catch {
        // skip broken logo URL
      }
    }
  }

  return pdf.save();
}
