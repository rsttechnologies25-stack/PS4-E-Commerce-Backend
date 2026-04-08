-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "splashContent" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcmToken" TEXT;
