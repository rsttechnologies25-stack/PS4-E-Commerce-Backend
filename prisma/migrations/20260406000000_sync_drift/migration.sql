-- Sync drift from manual DB changes (Prisma db push)
-- Tables and columns added manually but missing in migrations

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "BannedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BannedEmail_email_key" ON "BannedEmail"("email");

-- AlterTable
ALTER TABLE "ShippingRule" ADD COLUMN IF NOT EXISTS "pincodes" TEXT DEFAULT '*';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "dispatchCutoffHour" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS "dispatchLimitText" TEXT NOT NULL DEFAULT 'ORDER WITHIN {time} HOURS',
ADD COLUMN IF NOT EXISTS "dispatchSundayPolicy" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;
