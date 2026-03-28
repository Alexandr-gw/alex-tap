import { describe, expect, it } from "vitest";

import { buildScheduleWorkerRows } from "./schedule-row-layout";
import type { JobDto, WorkerDto } from "../api/schedule.types";
import type { TaskDto } from "@/features/tasks/api/tasks.types";

const timezone = "America/Edmonton";

function buildWorker(id: string, name: string): WorkerDto {
  return { id, name, colorTag: null, phone: null };
}

function buildJob(overrides: Partial<JobDto> & Pick<JobDto, "id" | "workerIds" | "startAt" | "endAt">): JobDto {
  return {
    clientEmail: null,
    clientName: "Client",
    colorTag: null,
    currency: "CAD",
    endAt: overrides.endAt,
    id: overrides.id,
    location: null,
    serviceName: "Service",
    startAt: overrides.startAt,
    status: overrides.status ?? "OPEN",
    totalCents: 10000,
    workerId: overrides.workerId ?? overrides.workerIds[0] ?? null,
    workerIds: overrides.workerIds,
    workerName: null,
  };
}

function buildTask(overrides: Partial<TaskDto> & Pick<TaskDto, "id" | "assigneeIds" | "startAt" | "endAt">): TaskDto {
  return {
    assigneeIds: overrides.assigneeIds,
    companyId: "company-1",
    completed: overrides.completed ?? false,
    createdAt: "2026-03-27T00:00:00.000Z",
    customerAddress: overrides.customerAddress ?? null,
    customerId: null,
    customerName: overrides.customerName ?? "Client",
    description: overrides.description ?? null,
    endAt: overrides.endAt,
    id: overrides.id,
    startAt: overrides.startAt,
    subject: overrides.subject ?? "Task",
    updatedAt: "2026-03-27T00:00:00.000Z",
  };
}

describe("buildScheduleWorkerRows", () => {
  it("places overlapping jobs on separate lanes and counts completion per worker", () => {
    const workers = [buildWorker("worker-1", "Alex")];
    const jobs = [
      buildJob({
        id: "job-1",
        workerIds: ["worker-1"],
        startAt: "2026-03-27T15:00:00.000Z",
        endAt: "2026-03-27T16:00:00.000Z",
      }),
      buildJob({
        id: "job-2",
        workerIds: ["worker-1"],
        startAt: "2026-03-27T15:30:00.000Z",
        endAt: "2026-03-27T16:30:00.000Z",
        status: "DONE",
      }),
    ];

    const rows = buildScheduleWorkerRows(workers, jobs, [], timezone);

    expect(rows).toHaveLength(1);
    expect(rows[0].items).toHaveLength(2);
    expect(rows[0].items.map((item) => item.laneIndex)).toEqual([0, 1]);
    expect(rows[0].completed).toBe(1);
    expect(rows[0].total).toBe(2);
    expect(rows[0].rowHeight).toBeGreaterThan(56);
  });

  it("duplicates a multi-worker job into each assigned worker row", () => {
    const workers = [buildWorker("worker-1", "Alex"), buildWorker("worker-2", "Sam")];
    const jobs = [
      buildJob({
        id: "job-1",
        workerIds: ["worker-1", "worker-2"],
        startAt: "2026-03-27T15:00:00.000Z",
        endAt: "2026-03-27T16:00:00.000Z",
      }),
    ];

    const rows = buildScheduleWorkerRows(workers, jobs, [], timezone);

    expect(rows[0].items.map((item) => item.id)).toEqual(["job-1:worker-1"]);
    expect(rows[1].items.map((item) => item.id)).toEqual(["job-1:worker-2"]);
    expect(rows[0].total).toBe(1);
    expect(rows[1].total).toBe(1);
  });

  it("includes assigned tasks in totals and completion counts", () => {
    const workers = [buildWorker("worker-1", "Alex")];
    const tasks = [
      buildTask({
        id: "task-1",
        assigneeIds: ["worker-1"],
        startAt: "2026-03-27T17:00:00.000Z",
        endAt: "2026-03-27T17:30:00.000Z",
        completed: true,
      }),
    ];

    const rows = buildScheduleWorkerRows(workers, [], tasks, timezone);

    expect(rows[0].items).toHaveLength(1);
    expect(rows[0].items[0].itemType).toBe("task");
    expect(rows[0].completed).toBe(1);
    expect(rows[0].total).toBe(1);
  });
});
