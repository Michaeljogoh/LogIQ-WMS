-- Platform-managed user activation for operators and merchant portal users
ALTER TABLE "account_user" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "account_user" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "merchant_user" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "merchant_user" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
