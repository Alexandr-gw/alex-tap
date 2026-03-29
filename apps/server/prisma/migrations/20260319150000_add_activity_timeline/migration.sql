-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM (
  'JOB_CREATED',
  'JOB_COMPLETED',
  'JOB_CANCELED',
  'CLIENT_CREATED',
  'BOOKING_SUBMITTED',
  'PAYMENT_SUCCEEDED',
  'INVOICE_SENT'
);

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM (
  'USER',
  'PUBLIC',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "ActivityType" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "jobId" TEXT,
  "clientId" TEXT,
  "actorType" "ActivityActorType" NOT NULL,
  "actorId" TEXT,
  "actorLabel" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_companyId_createdAt_idx" ON "Activity"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_jobId_createdAt_idx" ON "Activity"("companyId", "jobId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_clientId_createdAt_idx" ON "Activity"("companyId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_entityType_entityId_createdAt_idx" ON "Activity"("companyId", "entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
