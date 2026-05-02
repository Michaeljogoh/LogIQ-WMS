import { z } from "zod";

/** Stored in `LabelTemplate.fields` — positions use top-left origin, points, y from top of page. */
export const labelFieldConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "barcode", "qr", "logo", "line"]),
  content: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
  fontSize: z.number().finite().positive().optional(),
  /** bwip-js `bcid` (e.g. code128, qrcode, ean13) */
  barcodeFormat: z.string().optional(),
});

export type LabelFieldConfig = z.infer<typeof labelFieldConfigSchema>;

export const labelFieldsArraySchema = z.array(labelFieldConfigSchema);

export function parseLabelFieldsJson(value: unknown): LabelFieldConfig[] {
  return labelFieldsArraySchema.parse(value);
}
