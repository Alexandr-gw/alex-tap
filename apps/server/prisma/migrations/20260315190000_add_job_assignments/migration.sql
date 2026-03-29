CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobAssignment_jobId_workerId_key" ON "JobAssignment"("jobId", "workerId");
CREATE INDEX "JobAssignment_workerId_idx" ON "JobAssignment"("workerId");

ALTER TABLE "JobAssignment"
ADD CONSTRAINT "JobAssignment_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobAssignment"
ADD CONSTRAINT "JobAssignment_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "JobAssignment" ("id", "jobId", "workerId", "createdAt")
SELECT
    'jass_' || SUBSTRING(md5("id" || ':' || "workerId") FROM 1 FOR 27),
    "id",
    "workerId",
    COALESCE("updatedAt", "createdAt")
FROM "Job"
WHERE "workerId" IS NOT NULL
ON CONFLICT ("jobId", "workerId") DO NOTHING;
