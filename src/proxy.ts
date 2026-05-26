import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveTwoFactorGuard } from "@/server/helpers/two-factor-guard";

const GUARDED_PREFIXES = ["/dashboard", "/portal", "/settings", "/onboarding"];

type SessionUserWith2Fa = {
  twoFactorEnabled?: boolean;
  twoFactorSetupCompleted?: boolean;
  accountId?: string | null;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isGuarded = GUARDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isGuarded) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.next();
  }

  const user = session.user as SessionUserWith2Fa;
  const guard = resolveTwoFactorGuard({
    pathname,
    hasSession: true,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    twoFactorSetupCompleted: user.twoFactorSetupCompleted ?? false,
    accountId: user.accountId ?? null,
  });

  if (guard.action === "redirect") {
    return NextResponse.redirect(new URL(guard.path, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
