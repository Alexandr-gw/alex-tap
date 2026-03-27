import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ListTodo,
  RefreshCw,
  X,
} from "lucide-react";
import type { ActivityItem } from "../api/activity.types";
import {
  filterActivityTabItems,
  filterNotificationItems,
  getAcknowledgedBookingIds,
  getUnreadActivityCount,
  setAcknowledgedBookingIds,
  sortActivityFeedItems,
  sortNotificationItems,
} from "../activity-feed";

type DrawerTab = "notifications" | "activity";

type Props = {
  open: boolean;
  items: ActivityItem[];
  notificationsLastReadAt?: number;
  activityLastReadAt?: number;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onNotificationsSeen?: () => void;
  onActivitySeen?: () => void;
  onClose: () => void;
};

export function ActivityDrawer({
  open,
  items,
  notificationsLastReadAt = 0,
  activityLastReadAt = 0,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onNotificationsSeen,
  onActivitySeen,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("notifications");
  const wasOpenRef = useRef(false);
  const [acknowledgedBookingIds, setAcknowledgedBookingIdsState] = useState<
    string[]
  >(() => getAcknowledgedBookingIds());

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      setActiveTab("notifications");
      wasOpenRef.current = true;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const notificationItems = useMemo(
    () => sortNotificationItems(filterNotificationItems(items)).slice(0, 10),
    [items],
  );
  const activityItems = useMemo(
    () => sortActivityFeedItems(filterActivityTabItems(items)),
    [items],
  );
  const notificationCount = useMemo(
    () => getUnreadActivityCount(notificationItems, notificationsLastReadAt),
    [notificationItems, notificationsLastReadAt],
  );
  const activityCount = useMemo(
    () => getUnreadActivityCount(activityItems, activityLastReadAt),
    [activityItems, activityLastReadAt],
  );
  const visibleItems =
    activeTab === "notifications" ? notificationItems : activityItems;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (activeTab === "notifications") {
      onNotificationsSeen?.();
      return;
    }

    onActivitySeen?.();
  }, [activeTab, onActivitySeen, onNotificationsSeen, open]);

  const acknowledgeBooking = (activityId: string) => {
    setAcknowledgedBookingIdsState((current) => {
      if (current.includes(activityId)) {
        return current;
      }

      const next = [...current, activityId];
      setAcknowledgedBookingIds(next);
      return next;
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close activity panel"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
              <Bell className="h-3.5 w-3.5" />
              {activeTab === "notifications" ? "Notifications" : "Activity"}
            </div>

            <div className="mt-3 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <DrawerTabButton
                label="Notifications"
                isActive={activeTab === "notifications"}
                count={notificationCount}
                onClick={() => setActiveTab("notifications")}
              />
              <DrawerTabButton
                label="Activity"
                isActive={activeTab === "activity"}
                count={activityCount}
                onClick={() => setActiveTab("activity")}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh || isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={["h-4 w-4", isRefreshing ? "animate-spin" : ""].join(
                  " ",
                )}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-2/5 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => {
                const tone = getActivityTone(item.type);
                const isBookingAttention =
                  item.type === "BOOKING_SUBMITTED" &&
                  !acknowledgedBookingIds.includes(item.id);
                const href = getPrimaryLink(item);
                const actionLabel = getActionLabel(item);
                const className = [
                  "block rounded-3xl border p-4 shadow-sm transition",
                  href
                    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                    : "",
                  tone.containerClass,
                  isBookingAttention
                    ? "border-violet-300 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-sky-100 shadow-lg shadow-violet-200/70 ring-1 ring-violet-200"
                    : "",
                ].join(" ");
                const content = (
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "grid h-11 w-11 flex-none place-items-center rounded-2xl",
                        tone.iconClass,
                        isBookingAttention ? "animate-pulse" : "",
                      ].join(" ")}
                    >
                      {tone.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                            tone.badgeClass,
                          ].join(" ")}
                        >
                          {tone.label}
                        </span>
                        {isBookingAttention ? (
                          <span className="inline-flex rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                            New
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
                        {item.message?.trim() || getFallbackMessage(item)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        {item.actorLabel ? (
                          <span className="rounded-full bg-white/70 px-2.5 py-1">
                            {item.actorLabel}
                          </span>
                        ) : null}
                        {item.jobId ? (
                          <span className="rounded-full bg-white/70 px-2.5 py-1">
                            Job {item.jobId.slice(0, 8)}
                          </span>
                        ) : null}
                        {item.clientId ? (
                          <span className="rounded-full bg-white/70 px-2.5 py-1">
                            Client {item.clientId.slice(0, 8)}
                          </span>
                        ) : null}
                        {href && actionLabel ? (
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 font-medium text-white">
                            {actionLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );

                return href ? (
                  <Link
                    key={item.id}
                    to={href}
                    onMouseEnter={() => {
                      if (isBookingAttention) {
                        acknowledgeBooking(item.id);
                      }
                    }}
                    onFocus={() => {
                      if (isBookingAttention) {
                        acknowledgeBooking(item.id);
                      }
                    }}
                    onClick={() => {
                      if (isBookingAttention) {
                        acknowledgeBooking(item.id);
                      }
                    }}
                    className={className}
                  >
                    {content}
                  </Link>
                ) : (
                  <article
                    key={item.id}
                    onMouseEnter={() => {
                      if (isBookingAttention) {
                        acknowledgeBooking(item.id);
                      }
                    }}
                    className={className}
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

type DrawerTabButtonProps = {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
};

function DrawerTabButton({
  label,
  count,
  isActive,
  onClick,
}: DrawerTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
        isActive
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          isActive ? "bg-slate-900 text-white" : "bg-white text-slate-500",
        ].join(" ")}
      >
        {count > 99 ? "99+" : count}
      </span>
    </button>
  );
}

function EmptyState({ tab }: { tab: DrawerTab }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <CalendarClock className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-900">
        {tab === "notifications"
          ? "No notifications right now"
          : "No recent activity yet"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {tab === "notifications"
          ? "New bookings, cancellations, and other action-required items will appear here first."
          : "Completed jobs, created tasks, payments, and other background activity will appear here."}
      </p>
    </div>
  );
}

function getPrimaryLink(item: ActivityItem) {
  if (item.type === "BOOKING_SUBMITTED") {
    const jobId = item.jobId ?? item.entityId;
    return `/app/new-bookings?jobId=${jobId}`;
  }

  if (item.jobId) {
    return `/app/jobs/${item.jobId}`;
  }

  if (item.entityType === "client" || item.clientId) {
    return `/app/clients/${item.clientId ?? item.entityId}`;
  }

  return null;
}

function getActionLabel(item: ActivityItem) {
  switch (item.type) {
    case "BOOKING_SUBMITTED":
      return "Open booking";
    case "JOB_CANCELED":
    case "JOB_RESCHEDULED":
      return "Review job";
    case "TASK_CREATED":
    case "TASK_COMPLETED":
      return "Open task";
    case "CLIENT_CREATED":
      return "Open client";
    default:
      return item.jobId ? "Open job" : null;
  }
}

function getFallbackMessage(item: ActivityItem) {
  const actor = item.actorLabel || "Someone";

  switch (item.type) {
    case "JOB_CREATED":
      return `${actor} created a job`;
    case "JOB_COMPLETED":
      return `${actor} completed a job`;
    case "JOB_CANCELED":
      return `${actor} canceled a job`;
    case "JOB_RESCHEDULED":
      return `${actor} rescheduled a job`;
    case "TASK_CREATED":
      return `${actor} created a task`;
    case "TASK_COMPLETED":
      return `${actor} completed a task`;
    case "CLIENT_CREATED":
      return `${actor} created a client`;
    case "BOOKING_SUBMITTED":
      return `${actor} submitted a booking`;
    case "PAYMENT_SUCCEEDED":
      return `${actor} recorded a successful payment`;
    case "INVOICE_SENT":
      return `${actor} sent an invoice`;
    default:
      return `${actor} performed an activity`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getActivityTone(type: ActivityItem["type"]) {
  switch (type) {
    case "BOOKING_SUBMITTED":
      return {
        label: "New booking",
        containerClass:
          "border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50 via-violet-50 to-sky-50",
        iconClass:
          "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 text-white shadow-lg shadow-violet-200/70",
        badgeClass: "bg-white/80 text-fuchsia-700",
        icon: <BookOpen className="h-5 w-5" />,
      };
    case "JOB_CANCELED":
      return {
        label: "Canceled job",
        containerClass: "border-rose-200 bg-rose-50/90",
        iconClass: "bg-rose-500 text-white shadow-lg shadow-rose-200/80",
        badgeClass: "bg-white/80 text-rose-700",
        icon: <CalendarClock className="h-5 w-5" />,
      };
    case "JOB_RESCHEDULED":
      return {
        label: "Job rescheduled",
        containerClass: "border-orange-200 bg-orange-50/90",
        iconClass: "bg-orange-500 text-white shadow-lg shadow-orange-200/80",
        badgeClass: "bg-white/80 text-orange-700",
        icon: <CalendarClock className="h-5 w-5" />,
      };
    case "JOB_CREATED":
      return {
        label: "Job created",
        containerClass: "border-emerald-200 bg-emerald-50/90",
        iconClass: "bg-emerald-500 text-white shadow-lg shadow-emerald-200/70",
        badgeClass: "bg-white/80 text-emerald-700",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "JOB_COMPLETED":
      return {
        label: "Job completed",
        containerClass: "border-sky-200 bg-sky-50/90",
        iconClass: "bg-sky-500 text-white shadow-lg shadow-sky-200/80",
        badgeClass: "bg-white/80 text-sky-700",
        icon: <ClipboardCheck className="h-5 w-5" />,
      };
    case "TASK_CREATED":
      return {
        label: "Task created",
        containerClass: "border-indigo-200 bg-indigo-50/90",
        iconClass: "bg-indigo-500 text-white shadow-lg shadow-indigo-200/80",
        badgeClass: "bg-white/80 text-indigo-700",
        icon: <ListTodo className="h-5 w-5" />,
      };
    case "TASK_COMPLETED":
      return {
        label: "Task completed",
        containerClass: "border-cyan-200 bg-cyan-50/90",
        iconClass: "bg-cyan-500 text-white shadow-lg shadow-cyan-200/80",
        badgeClass: "bg-white/80 text-cyan-700",
        icon: <ClipboardCheck className="h-5 w-5" />,
      };
    case "PAYMENT_SUCCEEDED":
    case "INVOICE_SENT":
      return {
        label: type === "PAYMENT_SUCCEEDED" ? "Invoice paid" : "Invoice sent",
        containerClass: "border-amber-200 bg-amber-50/90",
        iconClass: "bg-amber-400 text-amber-950 shadow-lg shadow-amber-200/80",
        badgeClass: "bg-white/80 text-amber-800",
        icon: <CircleDollarSign className="h-5 w-5" />,
      };
    default:
      return {
        label: "Activity",
        containerClass: "border-slate-200 bg-slate-50/90",
        iconClass: "bg-slate-700 text-white shadow-lg shadow-slate-200/80",
        badgeClass: "bg-white/80 text-slate-700",
        icon: <Bell className="h-5 w-5" />,
      };
  }
}
