import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { ActivityDrawer } from "@/features/activity/components/ActivityDrawer";
import { useRecentActivity } from "@/features/activity/hooks/activity.queries";
import {
  filterActivityTabItems,
  filterNotificationItems,
  getLastNotificationsReadAt,
  getLastActivityReadAt,
  getUnreadActivityCount,
  setLastNotificationsReadAt,
  setLastActivityReadAt,
  sortActivityFeedItems,
} from "@/features/activity/activity-feed";
import { useMe } from "@/features/me/hooks/useMe";
import {
  canManageCompany,
  getActiveMembership,
  getDisplayName,
  getInitials,
  getRoleLabel,
} from "@/features/me/me.selector.ts";

type Props = {
  onOpenSidebar?: () => void;
};

export function Header({ onOpenSidebar }: Props) {
  const { data: me } = useMe();
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationsLastReadAt, setNotificationsLastReadAtState] = useState(
    () => getLastNotificationsReadAt(),
  );
  const [activityLastReadAt, setActivityLastReadAtState] = useState(() =>
    getLastActivityReadAt(),
  );
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const name = getDisplayName(me ?? null);
  const initials = getInitials(name);
  const roleLabel = getRoleLabel(me ?? null);
  const membership = getActiveMembership(me ?? null);
  const company = membership?.companyName;
  const canManage = canManageCompany(me ?? null);
  const recentActivity = useRecentActivity(24, canManage);
  const activityItems = useMemo(
    () => sortActivityFeedItems(recentActivity.data ?? []),
    [recentActivity.data],
  );
  const notificationItems = useMemo(
    () => filterNotificationItems(activityItems),
    [activityItems],
  );
  const activityTabItems = useMemo(
    () => filterActivityTabItems(activityItems),
    [activityItems],
  );
  const unreadNotificationCount = useMemo(
    () => getUnreadActivityCount(notificationItems, notificationsLastReadAt),
    [notificationItems, notificationsLastReadAt],
  );
  const unreadActivityCount = useMemo(
    () => getUnreadActivityCount(activityTabItems, activityLastReadAt),
    [activityTabItems, activityLastReadAt],
  );
  const unreadCount = useMemo(
    () => unreadNotificationCount + unreadActivityCount,
    [unreadActivityCount, unreadNotificationCount],
  );

  useEffect(() => {
    const syncReadState = () => {
      setNotificationsLastReadAtState(getLastNotificationsReadAt());
      setActivityLastReadAtState(getLastActivityReadAt());
    };
    window.addEventListener("storage", syncReadState);
    return () => window.removeEventListener("storage", syncReadState);
  }, []);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isProfileOpen]);

  const handleNotificationsSeen = useCallback(() => {
    const nextReadAt = Date.now();
    setLastNotificationsReadAt(nextReadAt);
    setNotificationsLastReadAtState(nextReadAt);
  }, []);

  const handleActivitySeen = useCallback(() => {
    const nextReadAt = Date.now();
    setLastActivityReadAt(nextReadAt);
    setActivityLastReadAtState(nextReadAt);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/82 backdrop-blur supports-[backdrop-filter]:bg-white/74">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-white text-slate-700 shadow-sm hover:bg-sky-50 md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#4fc487_0%,#68aef1_100%)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(104,174,241,0.22)]">
              A
            </div>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">
                Alex-tap
              </div>
              <div className="text-xs text-slate-500">
                {company ? company : "Dashboard"}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:min-w-[280px]">
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleNotificationsSeen();
                  setIsActivityOpen(true);
                }}
                className="relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-sky-100 bg-white text-slate-700 shadow-sm hover:bg-sky-50"
                aria-label="Open notifications and activity"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-rose-200 bg-[linear-gradient(135deg,#ef4444_0%,#fb7185_100%)] px-1 text-[10px] font-semibold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsActivityOpen(false);
                  setIsProfileOpen((current) => !current);
                }}
                className="inline-flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 shadow-sm hover:bg-sky-50 sm:min-w-[200px]"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,#4fc487_0%,#68aef1_100%)] text-xs font-semibold text-white">
                  {initials}
                </span>

                <div className="hidden min-w-0 flex-1 text-left leading-tight sm:block">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {name}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {roleLabel}
                  </div>
                </div>

                <ChevronDown
                  className={[
                    "h-4 w-4 text-slate-500 transition-transform",
                    isProfileOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {isProfileOpen ? (
                <div className="absolute right-0 top-14 z-20 w-72 rounded-3xl border border-emerald-100 bg-white p-3 shadow-2xl">
                  <div className="rounded-2xl bg-[linear-gradient(135deg,#eefbf4_0%,#f2f8ff_100%)] px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {me?.email ?? "No email on file"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span className="rounded-full border border-white bg-white/90 px-2.5 py-1 text-slate-700">
                        {roleLabel}
                      </span>
                      <span className="rounded-full border border-white bg-white/90 px-2.5 py-1 text-slate-700">
                        {company ?? "No company"}
                      </span>
                    </div>
                  </div>
                  <LogoutButton className="w-full" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <ActivityDrawer
        open={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        items={activityItems}
        notificationsLastReadAt={notificationsLastReadAt}
        activityLastReadAt={activityLastReadAt}
        isLoading={recentActivity.isLoading}
        isRefreshing={recentActivity.isFetching}
        onNotificationsSeen={handleNotificationsSeen}
        onActivitySeen={handleActivitySeen}
        onRefresh={() => {
          void recentActivity.refetch();
        }}
      />
    </>
  );
}
