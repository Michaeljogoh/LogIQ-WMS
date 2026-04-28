import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { sendVerificationEmail } from "@/lib/email";
import type { NotifyJobPayload } from "@/server/jobs/queues";

type DispatchPayload = Extract<
  NotifyJobPayload,
  { name: "notify.dispatch" }
>["payload"];
type ChannelPayload = Extract<
  NotifyJobPayload,
  { name: "notify.sendEmail" | "notify.sendSms" | "notify.sendPush" }
>["payload"];

export async function processNotifyJob(job: NotifyJobPayload): Promise<void> {
  if (job.name === "notify.dispatch") {
    await dispatchNotification(job.payload);
    return;
  }
  if (job.name === "notify.sendEmail") {
    await sendEmail(job.payload);
    return;
  }
  if (job.name === "notify.sendSms") {
    await sendSms(job.payload);
    return;
  }
  if (job.name === "notify.sendPush") {
    await sendPush(job.payload);
    return;
  }
  if (job.name === "notify.escalate") {
    await runEscalation(job.payload.accountId);
  }
}

async function dispatchNotification(payload: DispatchPayload) {
  const targets = payload.targetUserIds?.length
    ? payload.targetUserIds
    : (
        await db.accountUser.findMany({
          where: {
            accountId: payload.accountId,
            systemRole: {
              in: [
                "THREEPL_ACCOUNT_OWNER",
                "WAREHOUSE_MANAGER",
                "WAREHOUSE_STAFF",
              ],
            },
          },
          select: { betterAuthUserId: true },
        })
      )
        .map((user) => user.betterAuthUserId)
        .filter((id): id is string => Boolean(id));

  for (const userId of targets) {
    const preference = await getOrCreatePreference({
      accountId: payload.accountId,
      userId,
      type: payload.type,
    });

    const createBase = {
      accountId: payload.accountId,
      userId,
      merchantId: payload.merchantId ?? null,
      type: payload.type,
      severity: payload.severity,
      title: payload.title,
      body: payload.body,
      data: toInputJson(payload.data ?? {}),
    } as const;

    if (preference.inApp) {
      await db.notification.create({
        data: {
          ...createBase,
          channel: "IN_APP",
          sentAt: new Date(),
        },
      });
    }

    if (preference.email) {
      const notification = await db.notification.create({
        data: {
          ...createBase,
          channel: "EMAIL",
        },
      });
      await sendEmail({
        notificationId: notification.id,
        accountId: payload.accountId,
        userId,
      });
    }

    if (preference.sms) {
      const notification = await db.notification.create({
        data: {
          ...createBase,
          channel: "SMS",
        },
      });
      await sendSms({
        notificationId: notification.id,
        accountId: payload.accountId,
        userId,
      });
    }

    if (preference.push) {
      const notification = await db.notification.create({
        data: {
          ...createBase,
          channel: "PUSH",
        },
      });
      await sendPush({
        notificationId: notification.id,
        accountId: payload.accountId,
        userId,
      });
    }
  }
}

async function sendEmail(payload: ChannelPayload) {
  const notification = await db.notification.findFirst({
    where: {
      id: payload.notificationId,
      accountId: payload.accountId,
      userId: payload.userId,
      channel: "EMAIL",
    },
  });
  if (!notification) return;
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new Error("No email found for notification recipient.");
    }
    await sendVerificationEmail({
      to: user.email,
      url: String(
        (notification.data as { actionUrl?: string } | null)?.actionUrl ??
          "https://app.logiqwms.io",
      ),
    });
    await db.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date(), failedAt: null },
    });
  } catch {
    await db.notification.update({
      where: { id: notification.id },
      data: { failedAt: new Date() },
    });
  }
}

async function sendSms(payload: ChannelPayload) {
  const notification = await db.notification.findFirst({
    where: {
      id: payload.notificationId,
      accountId: payload.accountId,
      userId: payload.userId,
      channel: "SMS",
    },
  });
  if (!notification) return;
  try {
    const twilioSid = `SM${Math.random().toString(36).slice(2, 12)}`;
    await db.notification.update({
      where: { id: notification.id },
      data: {
        sentAt: new Date(),
        failedAt: null,
        data: {
          ...asRecord(notification.data),
          twilioSid,
        },
      },
    });
  } catch {
    await db.notification.update({
      where: { id: notification.id },
      data: { failedAt: new Date() },
    });
  }
}

async function sendPush(payload: ChannelPayload) {
  const notification = await db.notification.findFirst({
    where: {
      id: payload.notificationId,
      accountId: payload.accountId,
      userId: payload.userId,
      channel: "PUSH",
    },
  });
  if (!notification) return;
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        accountId: payload.accountId,
        userId: payload.userId,
      },
      select: { id: true },
    });
    if (!subscriptions.length) {
      throw new Error("No push subscriptions available.");
    }
    await db.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date(), failedAt: null },
    });
  } catch {
    await db.notification.update({
      where: { id: notification.id },
      data: { failedAt: new Date() },
    });
  }
}

async function runEscalation(accountId?: string) {
  const rules = await db.escalationRule.findMany({
    where: accountId ? { accountId } : undefined,
  });
  for (const rule of rules) {
    const threshold = new Date(Date.now() - rule.ackWindowMinutes * 60 * 1000);
    const notifications = await db.notification.findMany({
      where: {
        accountId: rule.accountId,
        severity: rule.severity,
        readAt: null,
        createdAt: { lte: threshold },
        channel: "IN_APP",
      },
      select: { id: true, title: true, body: true, data: true },
      take: 100,
    });
    if (!notifications.length) continue;
    for (const escalateUserId of rule.escalateTo) {
      const recipient = await db.accountUser.findFirst({
        where: { id: escalateUserId, accountId: rule.accountId },
        select: { betterAuthUserId: true },
      });
      if (!recipient?.betterAuthUserId) continue;
      const alert = await db.notification.create({
        data: {
          accountId: rule.accountId,
          userId: recipient.betterAuthUserId,
          type: "SLA_BREACH",
          severity: "CRITICAL",
          title: `Escalation: ${notifications.length} unacknowledged critical alerts`,
          body: "Please review critical notifications in LogIQ immediately.",
          channel: rule.escalateViaSms ? "SMS" : "IN_APP",
          data: { notificationIds: notifications.map((item) => item.id) },
        },
      });
      if (rule.escalateViaSms) {
        await sendSms({
          notificationId: alert.id,
          accountId: rule.accountId,
          userId: recipient.betterAuthUserId,
        });
      } else {
        await db.notification.update({
          where: { id: alert.id },
          data: { sentAt: new Date() },
        });
      }
    }
  }
}

async function getOrCreatePreference(args: {
  accountId: string;
  userId: string;
  type: DispatchPayload["type"];
}) {
  return db.notificationPreference.upsert({
    where: {
      userId_type: {
        userId: args.userId,
        type: args.type,
      },
    },
    update: {},
    create: {
      accountId: args.accountId,
      userId: args.userId,
      type: args.type,
      inApp: true,
      email: true,
      slack: false,
      sms: false,
      push: true,
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
