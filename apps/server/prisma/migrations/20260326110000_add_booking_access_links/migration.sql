CREATE TABLE "BookingAccessLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAccessLink_jobId_key" ON "BookingAccessLink"("jobId");
CREATE UNIQUE INDEX "BookingAccessLink_token_key" ON "BookingAccessLink"("token");
CREATE INDEX "BookingAccessLink_companyId_createdAt_idx" ON "BookingAccessLink"("companyId", "createdAt");
CREATE INDEX "BookingAccessLink_companyId_expiresAt_idx" ON "BookingAccessLink"("companyId", "expiresAt");

ALTER TABLE "BookingAccessLink"
ADD CONSTRAINT "BookingAccessLink_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingAccessLink"
ADD CONSTRAINT "BookingAccessLink_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
