-- CreateTable
CREATE TABLE "public"."TaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."Task"
    ADD COLUMN "customerId" TEXT,
    ADD COLUMN "subject" TEXT,
    ADD COLUMN "description" TEXT,
    ADD COLUMN "scheduledAt" TIMESTAMP(3),
    ADD COLUMN "completed" BOOLEAN NOT NULL DEFAULT false;

-- Migrate legacy task data into the new lightweight task shape.
UPDATE "public"."Task" AS "task"
SET
    "customerId" = "job"."clientId",
    "subject" = "task"."title",
    "description" = "task"."notes",
    "scheduledAt" = COALESCE("task"."dueAt", "job"."startAt"),
    "completed" = CASE WHEN "task"."status" = 'DONE' THEN true ELSE false END
FROM "public"."Job" AS "job"
WHERE "job"."id" = "task"."jobId";

UPDATE "public"."Task"
SET
    "subject" = COALESCE("subject", 'Task'),
    "scheduledAt" = COALESCE("scheduledAt", CURRENT_TIMESTAMP)
WHERE "subject" IS NULL OR "scheduledAt" IS NULL;

INSERT INTO "public"."TaskAssignment" ("id", "taskId", "workerId")
SELECT
    'task_assignment_' || md5("id" || ':' || "assigneeWorkerId"),
    "id",
    "assigneeWorkerId"
FROM "public"."Task"
WHERE "assigneeWorkerId" IS NOT NULL;

ALTER TABLE "public"."Task"
    ALTER COLUMN "subject" SET NOT NULL,
    ALTER COLUMN "scheduledAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_taskId_workerId_key" ON "public"."TaskAssignment"("taskId", "workerId");
CREATE INDEX "TaskAssignment_workerId_idx" ON "public"."TaskAssignment"("workerId");
CREATE INDEX "Task_companyId_scheduledAt_idx" ON "public"."Task"("companyId", "scheduledAt");
CREATE INDEX "Task_companyId_completed_idx" ON "public"."Task"("companyId", "completed");
CREATE INDEX "Task_companyId_customerId_idx" ON "public"."Task"("companyId", "customerId");

-- AddForeignKey
ALTER TABLE "public"."Task"
    ADD CONSTRAINT "Task_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "public"."ClientProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."TaskAssignment"
    ADD CONSTRAINT "TaskAssignment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."TaskAssignment"
    ADD CONSTRAINT "TaskAssignment_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "public"."Task_companyId_status_idx";
DROP INDEX IF EXISTS "public"."Task_companyId_assigneeWorkerId_idx";
DROP INDEX IF EXISTS "public"."Task_companyId_jobId_idx";
DROP INDEX IF EXISTS "public"."Task_companyId_dueAt_idx";

ALTER TABLE "public"."Task" DROP CONSTRAINT IF EXISTS "Task_jobId_fkey";
ALTER TABLE "public"."Task" DROP CONSTRAINT IF EXISTS "Task_assigneeWorkerId_fkey";

ALTER TABLE "public"."Task"
    DROP COLUMN "jobId",
    DROP COLUMN "assigneeWorkerId",
    DROP COLUMN "status",
    DROP COLUMN "title",
    DROP COLUMN "notes",
    DROP COLUMN "dueAt";

