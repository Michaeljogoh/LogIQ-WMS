import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/merchant/sign-in");
  }

  const user = session.user as {
    systemRole?: string | null;
  };

  if (
    user.systemRole &&
    user.systemRole !== "MERCHANT_OWNER" &&
    user.systemRole !== "MERCHANT_USER" &&
    user.systemRole !== "PLATFORM_ADMIN"
  ) {
    redirect("/dashboard");
  }

  return <div className="flex min-h-svh flex-col">{children}</div>;
}
