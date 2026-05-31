import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  clearSupportCookies,
  createEmergencySupportSession,
  createReadOnlySupportSession,
  endPlatformSupportSession,
  getActivePlatformSupportSession,
  isPlatformSupportMfaFresh,
  setSupportSessionCookie,
} from "@/server/helpers/platform-support-session";
import { getClientIpFromRequest } from "@/server/helpers/platform-support-audit";

const startReadOnlySchema = z.object({
  action: z.literal("start_read_only"),
  accountId: z.string().cuid(),
  reason: z.string().min(5).max(2000),
});

const startEmergencySchema = z.object({
  action: z.literal("start_emergency"),
  accessRequestId: z.string().cuid(),
});

const endSchema = z.object({
  action: z.literal("end"),
});

const bodySchema = z.discriminatedUnion("action", [
  startReadOnlySchema,
  startEmergencySchema,
  endSchema,
]);

async function requirePlatformAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { systemRole?: string } | undefined)
    ?.systemRole;
  if (role !== "PLATFORM_ADMIN" || !session?.user?.id) {
    return null;
  }
  return session.user.id;
}

export async function POST(request: Request) {
  const userId = await requirePlatformAdmin(request);
  if (!userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ip = getClientIpFromRequest(request);

  if (body.action === "end") {
    const active = await getActivePlatformSupportSession(
      request.headers.get("cookie"),
    );
    if (active) {
      await endPlatformSupportSession({
        sessionId: active.id,
        platformAdminUserId: userId,
        ipAddress: ip,
      });
    }
    await clearSupportCookies();
    return NextResponse.json({ ok: true, session: null });
  }

  if (body.action === "start_read_only") {
    try {
      const session = await createReadOnlySupportSession({
        accountId: body.accountId,
        platformAdminUserId: userId,
        reason: body.reason,
        ipAddress: ip,
      });
      await setSupportSessionCookie(session.id);
      return NextResponse.json({
        ok: true,
        session: {
          id: session.id,
          accountId: session.accountId,
          accountName: session.accountName,
          level: session.level,
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Could not start session",
        },
        { status: 400 },
      );
    }
  }

  if (!(await isPlatformSupportMfaFresh(request.headers.get("cookie")))) {
    return NextResponse.json(
      {
        error:
          "Verify two-factor authentication before starting emergency impersonation.",
      },
      { status: 403 },
    );
  }

  try {
    const session = await createEmergencySupportSession({
      accessRequestId: body.accessRequestId,
      platformAdminUserId: userId,
      ipAddress: ip,
    });
    await setSupportSessionCookie(session.id);
    const jar = await cookies();
    const { PLATFORM_SUPPORT_MFA_COOKIE } = await import("@/lib/platform-support");
    jar.delete(PLATFORM_SUPPORT_MFA_COOKIE);
    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        accountId: session.accountId,
        accountName: session.accountName,
        level: session.level,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not start session",
      },
      { status: 400 },
    );
  }
}
