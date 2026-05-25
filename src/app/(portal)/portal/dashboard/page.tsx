import { headers } from "next/headers";
import { PortalLinkPending } from "@/components/portal/portal-link-pending";
import { auth } from "@/lib/auth";
import { buildSessionTenantFields } from "@/server/helpers/session-enrichment";
import { MerchantPortalDashboard } from "./portal-dashboard-client";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    const tenant = await buildSessionTenantFields(session.user.id);
    if (!tenant?.merchantId) {
      return <PortalLinkPending />;
    }
  }

  return <MerchantPortalDashboard />;
}
