import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { WarehouseStaffDashboard } from "@/components/dashboard/warehouse-staff-dashboard";
import { auth } from "@/lib/auth";
import { getPlatformActiveAccount } from "@/server/helpers/platform-session";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { systemRole?: string } | undefined)
    ?.systemRole;

  if (role === "PLATFORM_ADMIN") {
    const active = await getPlatformActiveAccount();
    if (!active) {
      redirect("/platform/dashboard");
    }
  }

  if (role === "WAREHOUSE_STAFF") {
    return <WarehouseStaffDashboard />;
  }

  return <OperatorDashboard />;
}
