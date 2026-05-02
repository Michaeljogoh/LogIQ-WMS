/** Used with predicted daily orders to suggest shift staffing. */
export const ORDERS_PER_STAFF_PER_SHIFT = 25;

export const CAPACITY_CACHE_TTL_SECONDS = 86_400;

export function capacityCacheKey(accountId: string, warehouseId: string) {
  return `logiq:capacity:${accountId}:${warehouseId}`;
}
