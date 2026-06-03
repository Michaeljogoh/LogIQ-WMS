import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { DashboardBreadcrumb } from "@/components/shared/dashboard-breadcrumb";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const role = (session.user as { systemRole?: string }).systemRole;
  if (role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  const user = session.user;

  return (
    <SidebarProvider>
      <PlatformSidebar
        user={{
          name: user.name?.trim() || "Platform Admin",
          email: user.email ?? "",
          image: user.image,
        }}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <DashboardBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
