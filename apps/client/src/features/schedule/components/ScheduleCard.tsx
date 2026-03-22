import { JobNotificationIndicator } from "@/features/notifications/components/JobNotificationIndicator";
import type { ScheduleRowItem } from "../types/schedule-ui.types";
import { formatTimeLabel } from "../utils/schedule-time";

type Props = {
    item: ScheduleRowItem;
    timezone: string;
    isSelected?: boolean;
    isSyncing?: boolean;
    onClick?: (item: ScheduleRowItem) => void;
    onPointerDown?: (
        item: ScheduleRowItem,
        mode: "move" | "resize-end",
        e: React.PointerEvent<HTMLButtonElement | HTMLDivElement>
    ) => void;
    resizeEnabled?: boolean;
};

export function ScheduleCard({
    item,
    timezone,
    isSelected = false,
    isSyncing = false,
    onClick,
    onPointerDown,
    resizeEnabled = false,
}: Props) {
    const isTask = item.itemType === "task";
    const isCompleted = isTask ? item.completed : item.status === "DONE";
    const accent = isTask ? "#2563eb" : "#16a34a";
    const title = isTask ? item.title : item.serviceName ?? "Job";
    const subtitle = isTask ? item.customerName : item.clientName;

    return (
        <button
            type="button"
            data-schedule-card="true"
            disabled={isSyncing}
            onClick={() => onClick?.(item)}
            onPointerDown={(e) => {
                if (isSyncing) return;
                if ((e.target as HTMLElement).closest("[data-resize-handle='true']")) return;
                onPointerDown?.(item, "move", e);
            }}
            className={[
                "absolute h-11 overflow-hidden rounded-lg border border-slate-200 px-3 text-left text-xs shadow-sm transition select-none disabled:cursor-wait",
                isTask
                    ? isCompleted
                        ? "bg-blue-50/50 text-slate-500"
                        : "bg-blue-50 text-slate-900 hover:bg-blue-100/80"
                    : isCompleted
                      ? "bg-emerald-50/50 text-slate-500"
                      : "bg-emerald-50 text-slate-900 hover:bg-emerald-100/80",
                isSelected ? "ring-2 ring-slate-300" : "hover:border-slate-300",
                isCompleted ? "opacity-70" : "",
                isSyncing ? "opacity-80" : "",
            ].join(" ")}
            style={{
                left: `${item.left}px`,
                top: `${item.top}px`,
                width: `${item.width}px`,
                borderLeftWidth: "4px",
                borderLeftColor: accent,
            }}
            title={`${title} ${formatTimeLabel(item.startAt, timezone)} - ${formatTimeLabel(item.endAt, timezone)}${subtitle ? ` - ${subtitle}` : ""}`}
        >
            <div
                className={[
                    "truncate font-medium",
                    isCompleted ? "text-slate-500 line-through" : "text-slate-900",
                ].join(" ")}
            >
                {title}
            </div>

            <div
                className={[
                    "truncate text-[11px]",
                    isCompleted ? "text-slate-400 line-through" : "text-slate-500",
                ].join(" ")}
            >
                {formatTimeLabel(item.startAt, timezone)} - {formatTimeLabel(item.endAt, timezone)}
                {subtitle ? ` - ${subtitle}` : ""}
            </div>

            {!isTask ? (
                <div className="absolute right-3 top-2">
                    <JobNotificationIndicator jobId={item.entityId} />
                </div>
            ) : null}

            {isSyncing ? (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                </div>
            ) : null}

            <div
                data-resize-handle="true"
                onPointerDown={(e) => {
                    if (!resizeEnabled || isSyncing) return;
                    e.stopPropagation();
                    onPointerDown?.(item, "resize-end", e);
                }}
                className={[
                    "absolute right-0 top-0 h-full w-2 rounded-r-md",
                    resizeEnabled && !isSyncing
                        ? "cursor-ew-resize hover:bg-sky-300/40"
                        : "pointer-events-none opacity-0",
                ].join(" ")}
            />
        </button>
    );
}
