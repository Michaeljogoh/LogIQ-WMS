import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProc, requireRole } from "@/app/trpc/init";
import {
  labelFieldsArraySchema,
  parseLabelFieldsJson,
} from "@/lib/label-field-config";
import { requireLinkedTenant } from "@/server/api/ctx-ids";

const labelTypeZod = z.enum([
  "PRODUCT_BARCODE",
  "BIN_LOCATION",
  "PALLET",
  "SHIPPING_OUTER",
]);

export const labelTemplateRouter = createTRPCRouter({
  create: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        name: z.string().min(1),
        type: labelTypeZod,
        widthMm: z.number().positive().default(101.6),
        heightMm: z.number().positive().default(152.4),
        fields: z.unknown(),
        logoUrl: z.string().max(2048).trim().optional().nullable(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const fields = labelFieldsArraySchema.parse(input.fields);

      try {
        return await ctx.db.$transaction(async (tx) => {
          if (input.isDefault) {
            await tx.labelTemplate.updateMany({
              where: { accountId, type: input.type },
              data: { isDefault: false },
            });
          }

          return tx.labelTemplate.create({
            data: {
              accountId,
              name: input.name,
              type: input.type,
              widthMm: input.widthMm,
              heightMm: input.heightMm,
              fields,
              logoUrl: input.logoUrl ?? null,
              isDefault: input.isDefault ?? false,
            },
          });
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error) {
          const prismaError = error as { code?: string };
          if (prismaError.code === "P2002") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "A label template with this configuration already exists.",
            });
          }
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  update: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        templateId: z.string().cuid(),
        name: z.string().min(1).optional(),
        widthMm: z.number().positive().optional(),
        heightMm: z.number().positive().optional(),
        fields: z.unknown().optional(),
        logoUrl: z.string().max(2048).trim().nullable().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      const { templateId, ...patch } = input;

      const existing = await ctx.db.labelTemplate.findFirst({
        where: { id: templateId, accountId },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Label template not found.",
        });
      }

      const fields =
        patch.fields !== undefined
          ? parseLabelFieldsJson(patch.fields)
          : undefined;

      return ctx.db.$transaction(async (tx) => {
        if (patch.isDefault) {
          await tx.labelTemplate.updateMany({
            where: { accountId, type: existing.type },
            data: { isDefault: false },
          });
        }

        return tx.labelTemplate.update({
          where: { id: templateId },
          data: {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.widthMm !== undefined ? { widthMm: patch.widthMm } : {}),
            ...(patch.heightMm !== undefined
              ? { heightMm: patch.heightMm }
              : {}),
            ...(fields !== undefined ? { fields } : {}),
            ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
            ...(patch.isDefault !== undefined
              ? { isDefault: patch.isDefault }
              : {}),
          },
        });
      });
    }),

  list: protectedProc
    .use(
      requireRole(
        "THREEPL_ACCOUNT_OWNER",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_STAFF",
        "PLATFORM_ADMIN",
      ),
    )
    .input(
      z.object({
        type: labelTypeZod.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { accountId } = requireLinkedTenant(ctx);
      return ctx.db.labelTemplate.findMany({
        where: {
          accountId,
          ...(input.type !== undefined ? { type: input.type } : {}),
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
    }),
});
