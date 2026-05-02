import zipcodes from "zipcodes";

export function normalizeUsZip(zip: string): string {
  const digits = zip.replace(/\D/g, "").slice(0, 5);
  return digits.length === 5 ? digits : "";
}

export function zipToLatLng(zip: string): { lat: number; lng: number } | null {
  const z = normalizeUsZip(zip);
  if (!z) {
    return null;
  }
  const loc = zipcodes.lookup(z) as
    | { latitude?: number; longitude?: number }
    | undefined;
  if (
    loc?.latitude === undefined ||
    loc?.longitude === undefined ||
    Number.isNaN(loc.latitude) ||
    Number.isNaN(loc.longitude)
  ) {
    return null;
  }
  return { lat: loc.latitude, lng: loc.longitude };
}

/** Haversine distance in miles between two WGS84 points. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.7613; // mean Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceBetweenZipsMiles(zipA: string, zipB: string): number {
  const a = zipToLatLng(zipA);
  const b = zipToLatLng(zipB);
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }
  return haversineMiles(a, b);
}
