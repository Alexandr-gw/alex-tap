import type { JobListItemDto } from "../api/jobs.types";

type Props = {
    items: JobListItemDto[];
};

function isWithinDays(value: string, days: number, now = Date.now()) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return false;
    const diff = timestamp - now;
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isWithinPastDays(value: string, days: number, now = Date.now()) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return false;
    const diff = now - timestamp;
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function sumStatus(items: JobListItemDto[], status: JobListItemDto["status"]) {
    return items.filter((item) => item.status === status).length;
}

export function JobsOverviewCards({ items }: Props) {
    const pending = sumStatus(items, "PENDING_CONFIRMATION");
    const scheduledSoon = items.filter((item) => isWithinDays(item.startAt, 7)).length;
    const completedRecently = items.filter(
        (item) => item.status === "DONE" && isWithinPastDays(item.endAt, 30),
    ).length;
    const unassigned = items.filter((item) => item.workerIds.length === 0).length;

    const cards = [
        {
            label: "Pending review",
            value: pending,
            tone: "bg-amber-50 text-amber-900 border-amber-200",
            helper: "Needs confirmation or assignment",
        },
        {
            label: "Next 7 days",
            value: scheduledSoon,
            tone: "bg-sky-50 text-sky-900 border-sky-200",
            helper: "Scheduled work coming up",
        },
        {
            label: "Completed 30d",
            value: completedRecently,
            tone: "bg-emerald-50 text-emerald-900 border-emerald-200",
            helper: "Closed out recently",
        },
        {
            label: "Unassigned",
            value: unassigned,
            tone: "bg-rose-50 text-rose-900 border-rose-200",
            helper: "Still needs a worker",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <article
                    key={card.label}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="text-sm font-medium text-slate-500">{card.label}</div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="text-4xl font-semibold tracking-tight text-slate-950">
                            {card.value}
                        </div>
                        <span
                            className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                card.tone,
                            ].join(" ")}
                        >
                            {card.helper}
                        </span>
                    </div>
                </article>
            ))}
        </div>
    );
}
