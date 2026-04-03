import { describe, expect, it } from "vitest";

import {
  filterActivityTabItems,
  filterActivityToPastHours,
  filterNotificationItems,
  getUnreadActivityCount,
  isNotificationItem,
  sortActivityFeedItems,
  sortNotificationItems,
} from "./activity-feed";
import type { ActivityItem } from "./api/activity.types";

function buildActivityItem(
  overrides: Partial<ActivityItem> & Pick<ActivityItem, "id" | "type" | "createdAt">,
): ActivityItem {
  return {
    actorId: null,
    actorLabel: "Test User",
    actorType: "USER",
    clientId: null,
    createdAt: overrides.createdAt,
    entityId: overrides.entityId ?? overrides.id,
    entityType: overrides.entityType ?? "job",
    id: overrides.id,
    jobId: overrides.jobId ?? overrides.id,
    message: overrides.message ?? null,
    metadata: overrides.metadata ?? null,
    type: overrides.type,
  };
}

describe("activity-feed helpers", () => {
  it("keeps only items within the requested past-hour window", () => {
    const now = Date.parse("2026-03-27T18:00:00.000Z");
    const items = [
      buildActivityItem({
        id: "recent",
        type: "JOB_CREATED",
        createdAt: "2026-03-27T17:15:00.000Z",
      }),
      buildActivityItem({
        id: "stale",
        type: "JOB_CREATED",
        createdAt: "2026-03-26T16:59:00.000Z",
      }),
      buildActivityItem({
        id: "future",
        type: "JOB_CREATED",
        createdAt: "2026-03-27T18:30:00.000Z",
      }),
    ];

    expect(filterActivityToPastHours(items, 24, now).map((item) => item.id)).toEqual(["recent"]);
  });

  it("splits notification items from general activity items", () => {
    const items = [
      buildActivityItem({
        id: "booking",
        type: "BOOKING_SUBMITTED",
        createdAt: "2026-03-27T17:00:00.000Z",
      }),
      buildActivityItem({
        id: "rescheduled",
        type: "JOB_RESCHEDULED",
        createdAt: "2026-03-27T16:00:00.000Z",
      }),
      buildActivityItem({
        id: "task",
        type: "TASK_CREATED",
        createdAt: "2026-03-27T15:00:00.000Z",
      }),
    ];

    expect(isNotificationItem(items[0])).toBe(true);
    expect(isNotificationItem(items[2])).toBe(false);
    expect(filterNotificationItems(items).map((item) => item.id)).toEqual([
      "booking",
      "rescheduled",
    ]);
    expect(filterActivityTabItems(items).map((item) => item.id)).toEqual(["task"]);
  });

  it("sorts notifications newest first and activity with bookings pinned first", () => {
    const items = [
      buildActivityItem({
        id: "job-created",
        type: "JOB_CREATED",
        createdAt: "2026-03-27T17:00:00.000Z",
      }),
      buildActivityItem({
        id: "booking",
        type: "BOOKING_SUBMITTED",
        createdAt: "2026-03-27T15:00:00.000Z",
      }),
      buildActivityItem({
        id: "task-created",
        type: "TASK_CREATED",
        createdAt: "2026-03-27T18:00:00.000Z",
      }),
      buildActivityItem({
        id: "job-canceled",
        type: "JOB_CANCELED",
        createdAt: "2026-03-27T19:00:00.000Z",
      }),
    ];

    expect(sortNotificationItems(items).map((item) => item.id)).toEqual([
      "job-canceled",
      "task-created",
      "job-created",
      "booking",
    ]);

    expect(sortActivityFeedItems(items).map((item) => item.id)).toEqual([
      "booking",
      "job-canceled",
      "task-created",
      "job-created",
    ]);
  });

  it("counts only items newer than the stored read timestamp", () => {
    const items = [
      buildActivityItem({
        id: "before",
        type: "JOB_CREATED",
        createdAt: "2026-03-27T17:00:00.000Z",
      }),
      buildActivityItem({
        id: "after-1",
        type: "JOB_CANCELED",
        createdAt: "2026-03-27T17:30:00.000Z",
      }),
      buildActivityItem({
        id: "after-2",
        type: "TASK_CREATED",
        createdAt: "2026-03-27T18:00:00.000Z",
      }),
      buildActivityItem({
        id: "broken",
        type: "TASK_CREATED",
        createdAt: "not-a-date",
      }),
    ];

    expect(getUnreadActivityCount(items, Date.parse("2026-03-27T17:15:00.000Z"))).toBe(2);
  });
});
