ALTER TABLE "Job"
ADD COLUMN "publicBookingIntentId" TEXT;

CREATE UNIQUE INDEX "Job_publicBookingIntentId_key"
ON "Job"("publicBookingIntentId");
