import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * RBAC and tenant guards — implement in Module 2 (Authentication & Multi-Tenancy).
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and common metadata.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
