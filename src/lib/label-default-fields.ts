import type { LabelFieldConfig } from "@/lib/label-field-config";

export function defaultFieldsForLabelType(
  type: "PRODUCT_BARCODE" | "BIN_LOCATION" | "PALLET" | "SHIPPING_OUTER",
): LabelFieldConfig[] {
  switch (type) {
    case "PRODUCT_BARCODE":
      return [
        {
          id: crypto.randomUUID(),
          type: "text",
          content: "{{name}}",
          x: 24,
          y: 24,
          width: 260,
          height: 24,
          fontSize: 11,
        },
        {
          id: crypto.randomUUID(),
          type: "barcode",
          content: "{{sku}}",
          x: 24,
          y: 52,
          width: 260,
          height: 72,
          barcodeFormat: "code128",
        },
      ];
    case "BIN_LOCATION":
      return [
        {
          id: crypto.randomUUID(),
          type: "text",
          content: "{{zoneCode}} — {{binLabel}}",
          x: 24,
          y: 24,
          width: 280,
          height: 28,
          fontSize: 14,
        },
        {
          id: crypto.randomUUID(),
          type: "qr",
          content: "{{binLabel}}",
          x: 24,
          y: 60,
          width: 120,
          height: 120,
          barcodeFormat: "qrcode",
        },
      ];
    case "PALLET":
      return [
        {
          id: crypto.randomUUID(),
          type: "text",
          content: "PO {{poNumber}}",
          x: 24,
          y: 24,
          width: 280,
          height: 24,
          fontSize: 12,
        },
        {
          id: crypto.randomUUID(),
          type: "text",
          content: "Pallet {{palletId}}",
          x: 24,
          y: 52,
          width: 280,
          height: 24,
          fontSize: 11,
        },
        {
          id: crypto.randomUUID(),
          type: "barcode",
          content: "{{palletId}}",
          x: 24,
          y: 88,
          width: 280,
          height: 80,
          barcodeFormat: "code128",
        },
      ];
    case "SHIPPING_OUTER":
      return [
        {
          id: crypto.randomUUID(),
          type: "text",
          content: "SHIP — {{name}}",
          x: 24,
          y: 24,
          width: 280,
          height: 22,
          fontSize: 11,
        },
        {
          id: crypto.randomUUID(),
          type: "line",
          content: "",
          x: 24,
          y: 52,
          width: 260,
          height: 2,
        },
      ];
    default:
      return [];
  }
}

export const LABEL_TOKEN_HELP: Record<
  "PRODUCT_BARCODE" | "BIN_LOCATION" | "PALLET" | "SHIPPING_OUTER",
  string[]
> = {
  PRODUCT_BARCODE: ["sku", "name", "barcode", "merchantName"],
  BIN_LOCATION: [
    "binLabel",
    "zoneCode",
    "zoneName",
    "aisle",
    "rack",
    "level",
    "position",
    "warehouseName",
    "warehouseCode",
  ],
  PALLET: [
    "poNumber",
    "palletId",
    "merchantName",
    "warehouseCode",
    "warehouseName",
  ],
  SHIPPING_OUTER: ["sku", "name", "barcode", "merchantName"],
};
