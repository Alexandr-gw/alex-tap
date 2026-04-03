ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

ALTER TABLE "Notification"
ADD COLUMN "recipient" TEXT,
ADD COLUMN "providerMessageId" TEXT;

CREATE INDEX "Notification_targetType_targetId_channel_type_idx"
ON "Notification"("targetType", "targetId", "channel", "type");