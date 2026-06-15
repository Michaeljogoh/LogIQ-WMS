/**
 * Recursively converts values from Prisma raw SQL into JSON-safe primitives.
 * PostgreSQL COUNT/SUM and some aggregates return bigint, which breaks tRPC/JSON.
 */
export function serializeForJson<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return (
      value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER
        ? Number(value)
        : value.toString()
    ) as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item)) as T;
  }

  if (typeof value === "object") {
    const decimalLike = value as { toNumber?: () => number };
    if (typeof decimalLike.toNumber === "function") {
      return decimalLike.toNumber() as T;
    }

    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serializeForJson(nested);
    }
    return out as T;
  }

  return value;
}
