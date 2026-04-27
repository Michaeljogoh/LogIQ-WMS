import { MerchantClaim } from "@/components/auth/merchant-claim";

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
    <div className="space-y-2 p-6">
      <h1 className="text-lg font-semibold tracking-tight">
        Merchant dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Overview of inventory health, orders, and billing will appear here.
      </p>
    </div>
  );
}
