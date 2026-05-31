import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAssignWarehouseStaff } from "@/lib/operator-permissions";

export default async function StaffSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { systemRole?: string } | undefined)?.systemRole;

  if (!canAssignWarehouseStaff(role)) {
    redirect("/dashboard");
  }

  return children;
}
