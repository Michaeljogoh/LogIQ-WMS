import type { PrintQueueItem, Shipment } from "@/generated/prisma/client";
import { retrieveShipmentZpl } from "@/server/integrations/easypost";

export async function resolveZplPayload(args: {
  item: Pick<PrintQueueItem, "zplContent">;
  shipment: Pick<Shipment, "easypostShipmentId" | "trackingNumber"> | null;
}): Promise<Buffer> {
  if (args.item.zplContent) {
    return Buffer.from(args.item.zplContent, "utf8");
  }
  const epId = args.shipment?.easypostShipmentId;
  if (epId) {
    const zpl = await retrieveShipmentZpl(epId);
    if (zpl) {
      return Buffer.from(zpl, "utf8");
    }
  }
  const tracking = args.shipment?.trackingNumber ?? "LOGIQ";
  const fallback = `^XA^FO40,40^A0N,36,36^FD${tracking}^FS^FO40,120^BCN,100,Y,N,N^FD${tracking}^FS^XZ`;
  return Buffer.from(fallback, "utf8");
}
