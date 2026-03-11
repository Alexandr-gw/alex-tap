-- AlterEnum
ALTER TYPE "public"."JobStatus" ADD VALUE 'PENDING_CONFIRMATION';

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('BOOKING_REVIEW');

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "public"."AlertType" NOT NULL DEFAULT 'BOOKING_REVIEW',
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_jobId_membershipId_type_key" ON "public"."Alert"("jobId", "membershipId", "type");

-- CreateIndex
CREATE INDEX "Alert_companyId_membershipId_status_createdAt_idx" ON "public"."Alert"("companyId", "membershipId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_companyId_jobId_status_idx" ON "public"."Alert"("companyId", "jobId", "status");

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
