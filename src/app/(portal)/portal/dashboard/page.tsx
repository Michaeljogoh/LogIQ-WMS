import { MerchantClaim } from "@/components/auth/merchant-claim";
import { MerchantPortalDashboard } from "./portal-dashboard-client";

export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ merchantUserId?: string }>;
}>) {
  const sp = await searchParams;

  if (sp.merchantUserId) {
    return <MerchantClaim merchantUserId={sp.merchantUserId} />;
  }

  return (
    <MerchantPortalDashboard />
  );
}
