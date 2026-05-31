import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSupportMfaCookie } from "@/server/helpers/platform-support-session";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { systemRole?: string } | undefined)
    ?.systemRole;

  if (role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await setSupportMfaCookie();
  return NextResponse.json({ ok: true });
}
