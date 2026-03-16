-- AlterTable
ALTER TABLE "public"."Task"
    ADD COLUMN "startAt" TIMESTAMP(3),
    ADD COLUMN "endAt" TIMESTAMP(3);

UPDATE "public"."Task"
SET
    "startAt" = COALESCE("scheduledAt", CURRENT_TIMESTAMP),
    "endAt" = COALESCE("scheduledAt", CURRENT_TIMESTAMP) + INTERVAL '1 hour';

ALTER TABLE "public"."Task"
    ALTER COLUMN "startAt" SET NOT NULL,
    ALTER COLUMN "endAt" SET NOT NULL;

CREATE INDEX "Task_companyId_startAt_idx" ON "public"."Task"("companyId", "startAt");

DROP INDEX IF EXISTS "public"."Task_companyId_scheduledAt_idx";

ALTER TABLE "public"."Task"
    DROP COLUMN "scheduledAt";
