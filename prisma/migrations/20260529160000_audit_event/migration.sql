-- CreateEnum
CREATE TYPE "AuditEventSource" AS ENUM ('TRPC', 'SUPPORT', 'AUTH', 'SYSTEM');

-- CreateTable
CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "systemRole" "SystemRole",
    "accountId" TEXT,
    "merchantId" TEXT,
    "action" TEXT NOT NULL,
    "source" "AuditEventSource" NOT NULL DEFAULT 'TRPC',
    "procedurePath" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_event_createdAt_idx" ON "audit_event"("createdAt");

-- CreateIndex
CREATE INDEX "audit_event_systemRole_createdAt_idx" ON "audit_event"("systemRole", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_accountId_createdAt_idx" ON "audit_event"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_actorUserId_createdAt_idx" ON "audit_event"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_action_idx" ON "audit_event"("action");

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill legacy platform support audit rows
INSERT INTO "audit_event" (
    "id",
    "actorUserId",
    "systemRole",
    "accountId",
    "action",
    "source",
    "reason",
    "ipAddress",
    "metadata",
    "createdAt"
)
SELECT
    "id",
    "platformAdminUserId",
    'PLATFORM_ADMIN'::"SystemRole",
    "accountId",
    "action",
    'SUPPORT'::"AuditEventSource",
    "reason",
    "ipAddress",
    "metadata",
    "createdAt"
FROM "platform_support_audit_log"
ON CONFLICT ("id") DO NOTHING;
