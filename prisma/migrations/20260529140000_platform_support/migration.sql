-- CreateEnum
CREATE TYPE "PlatformSupportLevel" AS ENUM ('READ_ONLY', 'EMERGENCY_IMPERSONATION');

-- CreateEnum
CREATE TYPE "PlatformSupportAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "PlatformSupportEscalatedAction" AS ENUM ('UNLOCK_STUCK_SHIPMENT', 'REQUEUE_WEBHOOK', 'REGENERATE_LABEL', 'RETRY_SYNC');

-- CreateTable
CREATE TABLE "platform_support_access_request" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PlatformSupportAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvalTokenHash" TEXT NOT NULL,
    "requestExpiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByAccountUserId" TEXT,
    "deniedAt" TIMESTAMP(3),
    "impersonationExpiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_support_access_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_support_session" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platformAdminUserId" TEXT NOT NULL,
    "level" "PlatformSupportLevel" NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "accessRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_support_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_support_audit_log" (
    "id" TEXT NOT NULL,
    "platformAdminUserId" TEXT NOT NULL,
    "accountId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_support_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_support_access_request_approvalTokenHash_key" ON "platform_support_access_request"("approvalTokenHash");

-- CreateIndex
CREATE INDEX "platform_support_access_request_accountId_status_idx" ON "platform_support_access_request"("accountId", "status");

-- CreateIndex
CREATE INDEX "platform_support_access_request_requestedByUserId_status_idx" ON "platform_support_access_request"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "platform_support_session_platformAdminUserId_endedAt_idx" ON "platform_support_session"("platformAdminUserId", "endedAt");

-- CreateIndex
CREATE INDEX "platform_support_session_accountId_idx" ON "platform_support_session"("accountId");

-- CreateIndex
CREATE INDEX "platform_support_audit_log_accountId_createdAt_idx" ON "platform_support_audit_log"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_support_audit_log_platformAdminUserId_createdAt_idx" ON "platform_support_audit_log"("platformAdminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "platform_support_access_request" ADD CONSTRAINT "platform_support_access_request_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_access_request" ADD CONSTRAINT "platform_support_access_request_approvedByAccountUserId_fkey" FOREIGN KEY ("approvedByAccountUserId") REFERENCES "account_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_session" ADD CONSTRAINT "platform_support_session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_session" ADD CONSTRAINT "platform_support_session_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "platform_support_access_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_audit_log" ADD CONSTRAINT "platform_support_audit_log_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "logiq_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
