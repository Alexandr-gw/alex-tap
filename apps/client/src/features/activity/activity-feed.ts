import type { ActivityItem } from "./api/activity.types";
const NOTIFICATION_TYPES = new Set<ActivityItem["type"]>([
  "BOOKING_SUBMITTED",
  "JOB_CANCELED",
  "JOB_RESCHEDULED",
]);

export const NOTIFICATIONS_LAST_READ_AT_KEY =
  "alex-tap.activity-feed.notifications-last-read-at";
export const ACTIVITY_LAST_READ_AT_KEY =
  "alex-tap.activity-feed.activity-last-read-at";
export const LEGACY_ACTIVITY_FEED_LAST_READ_AT_KEY =
  "alex-tap.activity-feed.last-read-at";
export const ACTIVITY_FEED_ACKNOWLEDGED_BOOKINGS_KEY =
  "alex-tap.activity-feed.acknowledged-bookings";

export function filterActivityToPastHours(
  items: ActivityItem[],
  hours = 24,
  now = Date.now(),
) {
  const windowStart = now - hours * 60 * 60 * 1000;

    return items.filter((item) => {
    const createdAt = Date.parse(item.createdAt);
    return (
      Number.isFinite(createdAt) &&
      createdAt >= windowStart &&
      createdAt <= now
    );
  });
}

export function isNotificationItem(item: ActivityItem) {
  return NOTIFICATION_TYPES.has(item.type);
}

export function filterNotificationItems(items: ActivityItem[]) {
  return items.filter((item) => isNotificationItem(item));
}

export function filterActivityTabItems(items: ActivityItem[]) {
  return items.filter((item) => !isNotificationItem(item));
}

export function sortNotificationItems(items: ActivityItem[]) {
  return [...items].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function sortActivityFeedItems(items: ActivityItem[]) {
  return [...items].sort((left, right) => {
    const leftIsBooking = left.type === "BOOKING_SUBMITTED";
    const rightIsBooking = right.type === "BOOKING_SUBMITTED";

    if (leftIsBooking !== rightIsBooking) {
      return leftIsBooking ? -1 : 1;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export function getUnreadActivityCount(
  items: ActivityItem[],
  lastReadAt: number,
) {
  return items.reduce((count, item) => {
    const createdAt = Date.parse(item.createdAt);
    if (!Number.isFinite(createdAt)) {
      return count;
    }

    return createdAt > lastReadAt ? count + 1 : count;
  }, 0);
}

function getStoredReadAt(key: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = window.localStorage.getItem(key);
  if (stored) {
    return Number.parseInt(stored, 10) || 0;
  }

  const legacy = window.localStorage.getItem(LEGACY_ACTIVITY_FEED_LAST_READ_AT_KEY);
  return legacy ? Number.parseInt(legacy, 10) || 0 : 0;
}

function setStoredReadAt(key: string, timestamp: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(timestamp));
}

export function getLastNotificationsReadAt() {
  return getStoredReadAt(NOTIFICATIONS_LAST_READ_AT_KEY);
}

export function setLastNotificationsReadAt(timestamp: number) {
  setStoredReadAt(NOTIFICATIONS_LAST_READ_AT_KEY, timestamp);
}

export function getLastActivityReadAt() {
  return getStoredReadAt(ACTIVITY_LAST_READ_AT_KEY);
}

export function setLastActivityReadAt(timestamp: number) {
  setStoredReadAt(ACTIVITY_LAST_READ_AT_KEY, timestamp);
}

export function getAcknowledgedBookingIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const stored = window.localStorage.getItem(
    ACTIVITY_FEED_ACKNOWLEDGED_BOOKINGS_KEY,
  );
  if (!stored) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

export function setAcknowledgedBookingIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const uniqueIds = [...new Set(ids)];
  window.localStorage.setItem(
    ACTIVITY_FEED_ACKNOWLEDGED_BOOKINGS_KEY,
    JSON.stringify(uniqueIds),
  );
}
