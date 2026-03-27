import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMe } from "@/features/me/hooks/useMe";
import { useAlertsList } from "@/features/alerts/hooks/alerts.queries";
import { useJobs } from "@/features/jobs/hooks/jobs.queries";
import { useScheduleDay } from "@/features/schedule/hooks/useScheduleDay";
import type { JobDto } from "@/features/schedule/api/schedule.types";
import { getTodayDate } from "@/features/schedule/utils/schedule-time";
import { useCompanySettings } from "@/features/settings/hooks/settings.queries";

function addDaysToDateKey(dateKey: string, days: number) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function formatMoney(amountCents: number, currency = "CAD") {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(amountCents / 100);
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
    }).format(date);
}

function sumJobValue(items: Array<{ totalCents: number }>) {
    return items.reduce((sum, item) => {
        const amount = Number(item.totalCents);
        return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
}

function isCompleted(status?: string) {
    return status === "DONE";
}

function isPending(status?: string) {
    return status !== "DONE" && status !== "CANCELED" && status !== "NO_SHOW";
}

function isLate(job: { endAt: string; status?: string }, now = Date.now()) {
    return Date.parse(job.endAt) < now && isPending(job.status);
}

function buildIdleWindows(jobs: JobDto[]) {
    const jobsByWorker = new Map<string, JobDto[]>();

    for (const job of jobs) {
        for (const workerId of job.workerIds) {
            const workerJobs = jobsByWorker.get(workerId) ?? [];
            workerJobs.push(job);
            jobsByWorker.set(workerId, workerJobs);
        }
    }

    return [...jobsByWorker.entries()]
        .flatMap(([workerId, workerJobs]) => {
            const sorted = [...workerJobs].sort(
                (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
            );

            return sorted.slice(1).map((job, index) => {
                const previous = sorted[index];
                const gapMinutes =
                    (Date.parse(job.startAt) - Date.parse(previous.endAt)) / 60000;

                return {
                    workerId,
                    gapMinutes,
                    previous,
                    next: job,
                };
            });
        })
        .filter((gap) => gap.gapMinutes >= 45)
        .sort((left, right) => right.gapMinutes - left.gapMinutes)
        .slice(0, 3);
}

function MetricCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string | number;
    helper: string;
}) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {value}
            </div>
            <div className="mt-2 text-sm text-slate-500">{helper}</div>
        </article>
    );
}

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export function DashboardHomePage() {
    const { data: me } = useMe();
    const companySettingsQuery = useCompanySettings();
    const timezone =
        me?.activeCompanyTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayKey = getTodayDate(timezone);
    const weekEndKey = addDaysToDateKey(todayKey, 6);
    const schedule = useScheduleDay(todayKey);
    const alertsQuery = useAlertsList("OPEN", true);
    const weeklyJobsQuery = useJobs({
        from: `${todayKey}T00:00:00`,
        to: `${weekEndKey}T23:59:59`,
        take: 300,
    });

    const todayJobs = schedule.jobs;
    const lateJobs = todayJobs.filter((job) => isLate(job));
    const nextJob =
        [...todayJobs]
            .filter((job) => Date.parse(job.startAt) >= Date.now() && isPending(job.status))
            .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))[0] ??
        null;
    const idleWindows = buildIdleWindows(todayJobs);
    const activeWorkers = new Set(todayJobs.flatMap((job) => job.workerIds)).size;
    const completedToday = todayJobs.filter((job) => isCompleted(job.status)).length;
    const pendingToday = todayJobs.filter((job) => isPending(job.status)).length;
    const todayValue = sumJobValue(todayJobs);
    const weekValue = sumJobValue(weeklyJobsQuery.data?.items ?? []);
    const unassignedJobs = todayJobs.filter((job) => job.workerIds.length === 0);
    const missedJobs = lateJobs;
    const unassignedBookings =
        alertsQuery.data?.items.filter((alert) => !alert.job.workerName) ?? [];
    const currency =
        todayJobs[0]?.currency ?? weeklyJobsQuery.data?.items[0]?.currency ?? "CAD";
    const bookingSlug = companySettingsQuery.data?.bookingSlug?.trim() ?? "";
    const bookingPath = bookingSlug ? `/book/${bookingSlug}` : null;
    const bookingUrl =
        bookingPath && typeof window !== "undefined"
            ? new URL(bookingPath, window.location.origin).toString()
            : bookingPath;

    async function handleCopyBookingLink() {
        if (!bookingUrl) return;

        try {
            await navigator.clipboard.writeText(bookingUrl);
            toast.success("Booking link copied.");
        } catch {
            toast.error("Could not copy the booking link.");
        }
    }

    async function handleShareBookingLink() {
        if (!bookingUrl) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Booking page",
                    text: "Book online here",
                    url: bookingUrl,
                });
                return;
            } catch {
                // Let the fallback below handle canceled/unsupported share outcomes quietly.
            }
        }

        await handleCopyBookingLink();
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Dashboard
                        </div>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                            Today at a glance
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Watch today’s job load, job value, worker activity, and the issues
                            that need attention before they turn into missed work.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-lg">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Job value today
                        </div>
                        <div className="mt-2 text-3xl font-semibold">
                            {formatMoney(todayValue, currency)}
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                            Weekly pipeline {formatMoney(weekValue, currency)}
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Jobs today"
                    value={todayJobs.length}
                    helper={`${completedToday} completed • ${pendingToday} pending`}
                />
                <MetricCard
                    label="Unassigned jobs"
                    value={unassignedJobs.length}
                    helper="Needs worker assignment"
                />
                <MetricCard
                    label="Active workers"
                    value={activeWorkers}
                    helper={`${schedule.workers.length} available on roster`}
                />
                <MetricCard
                    label="Open booking issues"
                    value={alertsQuery.data?.items.length ?? 0}
                    helper="Pending review and booking follow-up"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
                <div className="space-y-6">
                    <SectionCard title="Today's schedule preview">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Next job
                                </div>
                                {nextJob ? (
                                    <>
                                        <div className="mt-2 text-sm font-semibold text-slate-950">
                                            {nextJob.serviceName ?? "Job"}
                                        </div>
                                        <div className="mt-1 text-sm text-slate-600">
                                            {nextJob.clientName ?? "No client"}
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            {formatDateTime(nextJob.startAt)}
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-sm text-slate-500">
                                        No more upcoming jobs today.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Late jobs
                                </div>
                                <div className="mt-2 text-2xl font-semibold text-slate-950">
                                    {lateJobs.length}
                                </div>
                                <div className="mt-2 text-sm text-slate-500">
                                    Jobs already past end time and still not closed out.
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Idle gaps
                                </div>
                                <div className="mt-2 text-2xl font-semibold text-slate-950">
                                    {idleWindows.length}
                                </div>
                                <div className="mt-2 text-sm text-slate-500">
                                    Worker gaps of 45 minutes or more between jobs.
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {todayJobs.length ? (
                                sortDashboardJobs(todayJobs).slice(0, 6).map((job) => (
                                    <Link
                                        key={job.id}
                                        to={`/app/jobs/${job.id}`}
                                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-slate-950">
                                                {job.serviceName ?? "Job"}
                                            </div>
                                            <div className="mt-1 truncate text-sm text-slate-500">
                                                {job.clientName ?? "No client"} • {formatDateTime(job.startAt)}
                                            </div>
                                        </div>
                                        <div className="ml-4 text-right text-sm text-slate-500">
                                            {job.workerName || (job.workerIds.length ? `${job.workerIds.length} workers` : "Unassigned")}
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                    No jobs scheduled today.
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    <SectionCard title="Booking page">
                        {bookingUrl ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        Your booking page is live
                                    </div>
                                    <div className="mt-3 text-base font-semibold text-slate-950">
                                        {bookingPath}
                                    </div>
                                    <div className="mt-1 break-all text-sm text-slate-500">
                                        {bookingUrl}
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleCopyBookingLink();
                                        }}
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                                    >
                                        Copy link
                                    </button>
                                    <a
                                        href={bookingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                                    >
                                        Open page
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleShareBookingLink();
                                        }}
                                        className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        Share
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                <div className="text-sm font-semibold text-slate-950">
                                    Booking page is not configured yet
                                </div>
                                <div className="mt-2 text-sm text-slate-500">
                                    Add a public booking slug in company settings to generate your live booking link.
                                </div>
                                <Link
                                    to="/app/settings/company"
                                    className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                >
                                    Open company settings
                                </Link>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Alerts / issues">
                        <div className="space-y-4">
                            <IssueBlock
                                label="Missed jobs"
                                tone="rose"
                                items={missedJobs.map((job) => ({
                                    id: job.id,
                                    title: job.serviceName ?? "Job",
                                    subtitle: `${job.clientName ?? "No client"} • ${formatDateTime(job.endAt)}`,
                                    href: `/app/jobs/${job.id}`,
                                }))}
                                empty="No missed jobs right now."
                            />

                            <IssueBlock
                                label="Unassigned bookings"
                                tone="amber"
                                items={unassignedBookings.map((alert) => ({
                                    id: alert.id,
                                    title: alert.job.serviceName ?? "Booking",
                                    subtitle: `${alert.job.clientName} • ${formatDateTime(alert.job.startAt)}`,
                                    href: `/app/new-bookings?alertId=${alert.id}`,
                                }))}
                                empty="No unassigned bookings waiting."
                            />

                            <IssueBlock
                                label="Unassigned jobs"
                                tone="sky"
                                items={unassignedJobs.map((job) => ({
                                    id: job.id,
                                    title: job.serviceName ?? "Job",
                                    subtitle: `${job.clientName ?? "No client"} • ${formatDateTime(job.startAt)}`,
                                    href: `/app/jobs/${job.id}`,
                                }))}
                                empty="All today jobs are assigned."
                            />
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}

function sortDashboardJobs(items: JobDto[]) {
    return [...items].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
}

function IssueBlock({
    label,
    tone,
    items,
    empty,
}: {
    label: string;
    tone: "rose" | "amber" | "sky";
    items: Array<{ id: string; title: string; subtitle: string; href: string }>;
    empty: string;
}) {
    const toneClass =
        tone === "rose"
            ? "bg-rose-50 text-rose-700"
            : tone === "amber"
              ? "bg-amber-50 text-amber-700"
              : "bg-sky-50 text-sky-700";

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-950">{label}</div>
                <span className={["rounded-full px-2.5 py-1 text-xs font-semibold", toneClass].join(" ")}>
                    {items.length}
                </span>
            </div>

            <div className="mt-3 space-y-2">
                {items.length ? (
                    items.slice(0, 4).map((item) => (
                        <Link
                            key={item.id}
                            to={item.href}
                            className="block rounded-2xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
                        >
                            <div className="font-medium text-slate-950">{item.title}</div>
                            <div className="mt-1 text-sm text-slate-500">{item.subtitle}</div>
                        </Link>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        {empty}
                    </div>
                )}
            </div>
        </div>
    );
}
