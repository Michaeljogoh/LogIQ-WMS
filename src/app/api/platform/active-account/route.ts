import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Direct tenant cookie assignment without support session is no longer allowed.
 * Use /api/platform/support-session with Level 1 (read-only) or approved Level 3.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { systemRole?: string } | undefined)
    ?.systemRole;

  if (role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Use Platform → Support to start a read-only or approved emergency session.",
    },
    { status: 400 },
  );
}
