import EasyPost from "@easypost/api";

type AddressPayload = {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type RateOption = {
  id: string;
  carrier: string;
  service: string;
  rateCents: number;
  estimatedDays: number;
  isCheapest: boolean;
  isFastest: boolean;
  logiqRecommended: boolean;
};

const apiKey = process.env.EASYPOST_API_KEY ?? process.env.EASYPOST_TEST_KEY;
const easypostClient = apiKey ? new EasyPost(apiKey) : null;

function requireEasyPostClient() {
  if (!easypostClient) {
    throw new Error(
      "EasyPost is not configured. Set EASYPOST_API_KEY or EASYPOST_TEST_KEY.",
    );
  }
  return easypostClient;
}

export async function createRateShopShipment(args: {
  from: AddressPayload;
  to: AddressPayload;
  weightOz: number;
  /** Parcel dimensions in inches (optional; improves DIM-aware rating). */
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
}): Promise<{ easypostShipmentId: string; rates: RateOption[] }> {
  const client = requireEasyPostClient();
  const parcel: {
    weight: number;
    length?: number;
    width?: number;
    height?: number;
  } = {
    weight: args.weightOz,
  };
  if (
    args.lengthIn !== undefined &&
    args.widthIn !== undefined &&
    args.heightIn !== undefined &&
    args.lengthIn > 0 &&
    args.widthIn > 0 &&
    args.heightIn > 0
  ) {
    parcel.length = args.lengthIn;
    parcel.width = args.widthIn;
    parcel.height = args.heightIn;
  }
  const shipment = await client.Shipment.create({
    to_address: args.to,
    from_address: args.from,
    parcel,
  });
  const ratesRaw = Array.isArray(shipment.rates) ? shipment.rates : [];
  if (!ratesRaw.length) {
    return { easypostShipmentId: shipment.id, rates: [] };
  }
  const rates = ratesRaw.map((rate: any) => ({
    id: rate.id as string,
    carrier: String(rate.carrier ?? "UNKNOWN"),
    service: String(rate.service ?? "UNKNOWN"),
    rateCents: Math.round(Number(rate.rate ?? 0) * 100),
    estimatedDays: Number(rate.delivery_days ?? 0) || 0,
  }));
  const cheapest = Math.min(...rates.map((rate) => rate.rateCents));
  const fastest = Math.min(
    ...rates
      .map((rate) => rate.estimatedDays)
      .filter((days) => Number.isFinite(days) && days > 0),
  );
  const withFlags: RateOption[] = rates.map((rate) => ({
    ...rate,
    isCheapest: rate.rateCents === cheapest,
    isFastest: Number.isFinite(fastest)
      ? rate.estimatedDays === fastest
      : false,
    logiqRecommended:
      rate.rateCents === cheapest ||
      (Number.isFinite(fastest) &&
        rate.estimatedDays === fastest &&
        rate.rateCents <= cheapest + 250),
  }));
  return {
    easypostShipmentId: shipment.id,
    rates: withFlags,
  };
}

export async function buyShipmentLabel(args: {
  easypostShipmentId: string;
  rateId: string;
}): Promise<{
  easypostShipmentId: string;
  trackingNumber: string | null;
  carrier: string;
  service: string;
  labelUrl: string | null;
  rateCents: number;
  zplContent: string | null;
}> {
  const client = requireEasyPostClient();
  const bought = await client.Shipment.buy(
    args.easypostShipmentId,
    args.rateId,
  );
  const selectedRate = Array.isArray(bought.rates)
    ? (bought.rates.find((rate: any) => rate.id === args.rateId) ??
      bought.selected_rate)
    : bought.selected_rate;

  const rateCents = Math.round(
    Number((selectedRate as { rate?: string } | null)?.rate ?? 0) * 100,
  );

  const postageLabel = bought.postage_label as
    | {
        label_pdf_url?: string;
        label_url?: string;
        label_zpl_url?: string;
      }
    | null
    | undefined;

  let zplContent: string | null = null;
  const zplUrl = postageLabel?.label_zpl_url;
  if (zplUrl) {
    try {
      const zplRes = await fetch(zplUrl);
      if (zplRes.ok) {
        zplContent = await zplRes.text();
      }
    } catch {
      zplContent = null;
    }
  }

  return {
    easypostShipmentId: bought.id,
    trackingNumber: (bought.tracking_code as string | null | undefined) ?? null,
    carrier: String(selectedRate?.carrier ?? "UNKNOWN"),
    service: String(selectedRate?.service ?? "UNKNOWN"),
    labelUrl:
      (postageLabel?.label_pdf_url as string | undefined) ??
      (postageLabel?.label_url as string | undefined) ??
      null,
    rateCents,
    zplContent,
  };
}

export async function retrieveShipmentZpl(easypostShipmentId: string) {
  const client = requireEasyPostClient() as {
    Shipment: {
      retrieve: (id: string) => Promise<{
        postage_label?: { label_zpl_url?: string } | null;
      }>;
    };
  };
  const shipment = await client.Shipment.retrieve(easypostShipmentId);
  const zplUrl = shipment.postage_label?.label_zpl_url;
  if (!zplUrl) {
    return null;
  }
  try {
    const res = await fetch(zplUrl);
    if (!res.ok) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

export async function createUspsScanForm(easypostShipmentIds: string[]) {
  const client = requireEasyPostClient() as {
    ScanForm: {
      create: (params: {
        shipments: { id: string }[];
      }) => Promise<{ id: string; form_url: string; status: string }>;
    };
  };
  if (!easypostShipmentIds.length) {
    throw new Error("No USPS shipments available for a SCAN form.");
  }
  const scanForm = await client.ScanForm.create({
    shipments: easypostShipmentIds.map((id) => ({ id })),
  });
  return {
    id: scanForm.id,
    formUrl: scanForm.form_url,
    status: scanForm.status,
  };
}
