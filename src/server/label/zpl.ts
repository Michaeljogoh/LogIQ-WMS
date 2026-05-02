/** Minimal ZPL for direct thermal reprint; optional companion to PDF. */
export function productBarcodeZpl(args: { sku: string; name: string }): string {
  const line1 = args.sku.replace(/[^A-Za-z0-9-_.]/g, " ").slice(0, 40);
  const line2 = args.name.replace(/[^A-Za-z0-9-_. ]/g, " ").slice(0, 40);
  return `^XA
^CF0,30
^FO40,40^FDSKU: ${line1}^FS
^FO40,80^FD${line2}^FS
^FO40,140^BCN,80,Y,N,N
^FD${args.sku}^FS
^XZ`;
}

export function binLocationZpl(args: {
  binLabel: string;
  zoneCode: string;
}): string {
  const l = args.binLabel.slice(0, 30);
  const z = args.zoneCode.slice(0, 20);
  return `^XA
^CF0,40
^FO60,80^FDBin ${l}^FS
^FO60,140^FDZone ${z}^FS
^FO40,220^BCN,100,Y,N,N
^FD${l}^FS
^XZ`;
}

export function palletZpl(args: {
  poNumber: string;
  palletId: string;
}): string {
  return `^XA
^CF0,32
^FO50,60^FDPO ${args.poNumber.slice(0, 24)}^FS
^FO50,120^FDPallet ${args.palletId.slice(0, 30)}^FS
^FO50,200^BCN,90,Y,N,N
^FD${args.palletId.slice(0, 40)}^FS
^XZ`;
}
