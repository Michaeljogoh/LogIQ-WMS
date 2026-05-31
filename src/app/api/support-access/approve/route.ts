import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  approveEmergencyAccessByToken,
  denyEmergencyAccessByToken,
} from "@/server/helpers/platform-support-access";
import { getClientIpFromRequest } from "@/server/helpers/platform-support-audit";

const bodySchema = z.object({
  token: z.string().min(16),
  decision: z.enum(["approve", "deny"]),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const accountUser = await db.accountUser.findFirst({
    where: {
      betterAuthUserId: session.user.id,
      systemRole: "THREEPL_ACCOUNT_OWNER",
      isActive: true,
    },
    select: { id: true },
  });

  if (!accountUser) {
    return NextResponse.json(
      { error: "Only a tenant account owner can approve or deny this request" },
      { status: 403 },
    );
  }

  const ip = getClientIpFromRequest(request);

  try {
    if (body.decision === "approve") {
      const result = await approveEmergencyAccessByToken({
        token: body.token,
        approverAccountUserId: accountUser.id,
        approverUserId: session.user.id,
        ipAddress: ip,
      });
      return NextResponse.json({
        ok: true,
        decision: "approve",
        accountName: result.accountName,
      });
    }

    await denyEmergencyAccessByToken({
      token: body.token,
      approverAccountUserId: accountUser.id,
      approverUserId: session.user.id,
      ipAddress: ip,
    });
    return NextResponse.json({ ok: true, decision: "deny" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 400 },
    );
  }
}
