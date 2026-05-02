export type RoutingConditionField =
  | "destinationState"
  | "orderValue"
  | "carrier"
  | "sku";

export type RoutingConditionOperator = "eq" | "in" | "gte" | "lte";

export type RoutingCondition = {
  field: RoutingConditionField;
  operator: RoutingConditionOperator;
  value: unknown;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  return [String(value)];
}

/**
 * Evaluate routing rule conditions (AND). `orderValue` uses total order line units
 * as a stand-in when no monetary total exists on Order.
 */
export function evaluateRoutingConditions(
  conditions: unknown,
  order: {
    shippingState: string;
    lines: {
      sku: string;
      quantity: number;
      product?: { sku: string } | null;
    }[];
  },
  ctx?: { carrier?: string | null },
): boolean {
  if (!Array.isArray(conditions)) {
    return true;
  }
  const totalUnits = order.lines.reduce((s, l) => s + l.quantity, 0);
  for (const raw of conditions) {
    const c = raw as RoutingCondition;
    if (!c?.field || !c.operator) {
      continue;
    }
    switch (c.field) {
      case "destinationState": {
        const state = order.shippingState.trim().toUpperCase();
        if (c.operator === "eq") {
          if (state !== String(c.value).trim().toUpperCase()) {
            return false;
          }
        } else if (c.operator === "in") {
          const set = new Set(asStringArray(c.value).map((s) => s.toUpperCase()));
          if (!set.has(state)) {
            return false;
          }
        } else {
          return false;
        }
        break;
      }
      case "orderValue": {
        const n = Number(c.value);
        if (Number.isNaN(n)) {
          return false;
        }
        if (c.operator === "gte") {
          if (!(totalUnits >= n)) {
            return false;
          }
        } else if (c.operator === "lte") {
          if (!(totalUnits <= n)) {
            return false;
          }
        } else if (c.operator === "eq") {
          if (totalUnits !== n) {
            return false;
          }
        } else {
          return false;
        }
        break;
      }
      case "carrier": {
        const carrier = (ctx?.carrier ?? "").trim().toUpperCase();
        if (!carrier) {
          return false;
        }
        if (c.operator === "eq") {
          if (carrier !== String(c.value).trim().toUpperCase()) {
            return false;
          }
        } else if (c.operator === "in") {
          const set = new Set(asStringArray(c.value).map((s) => s.toUpperCase()));
          if (!set.has(carrier)) {
            return false;
          }
        } else {
          return false;
        }
        break;
      }
      case "sku": {
        const skus = new Set(
          order.lines.map((l) => (l.product?.sku ?? l.sku).trim().toUpperCase()),
        );
        const want = String(c.value).trim().toUpperCase();
        if (c.operator === "eq") {
          if (!skus.has(want)) {
            return false;
          }
        } else if (c.operator === "in") {
          const set = new Set(asStringArray(c.value).map((s) => s.toUpperCase()));
          const any = [...skus].some((s) => set.has(s));
          if (!any) {
            return false;
          }
        } else {
          return false;
        }
        break;
      }
      default:
        return false;
    }
  }
  return true;
}
