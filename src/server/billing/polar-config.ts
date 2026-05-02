import { Polar } from "@polar-sh/sdk";
import type { Plan } from "@/generated/prisma/client";

export const PLAN_LIMITS: Record<
  Plan,
  { ordersPerMonth: number; warehouses: number; merchants: number }
> = {
  STARTER: { ordersPerMonth: 500, warehouses: 1, merchants: 5 },
  GROWTH: { ordersPerMonth: 5000, warehouses: 3, merchants: 25 },
  ENTERPRISE: {
    ordersPerMonth: Number.POSITIVE_INFINITY,
    warehouses: Number.POSITIVE_INFINITY,
    merchants: Number.POSITIVE_INFINITY,
  },
};

export function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
}

export function getPolarAccessToken(): string | null {
  const t = process.env.POLAR_ACCESS_TOKEN;
  return t && t.length > 0 ? t : null;
}

export function getPolar(): Polar {
  const accessToken = getPolarAccessToken();
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not configured.");
  }
  return new Polar({ accessToken, server: polarServer() });
}

export function polarProductIdForPlan(plan: Plan): string | null {
  const key =
    plan === "STARTER"
      ? "POLAR_PRODUCT_STARTER_ID"
      : plan === "GROWTH"
        ? "POLAR_PRODUCT_GROWTH_ID"
        : "POLAR_PRODUCT_ENTERPRISE_ID";
  const id = process.env[key];
  return id && id.length > 0 ? id : null;
}

const productToPlanCache = (): Map<string, Plan> => {
  const m = new Map<string, Plan>();
  const starter = process.env.POLAR_PRODUCT_STARTER_ID;
  const growth = process.env.POLAR_PRODUCT_GROWTH_ID;
  const enterprise = process.env.POLAR_PRODUCT_ENTERPRISE_ID;
  if (starter) {
    m.set(starter, "STARTER");
  }
  if (growth) {
    m.set(growth, "GROWTH");
  }
  if (enterprise) {
    m.set(enterprise, "ENTERPRISE");
  }
  return m;
};

export function planForPolarProductId(productId: string): Plan | null {
  return productToPlanCache().get(productId) ?? null;
}
