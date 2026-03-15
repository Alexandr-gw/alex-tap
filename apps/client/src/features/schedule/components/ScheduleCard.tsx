import type { ScheduleRowItem } from "../types/schedule-ui.types";
import { formatTimeLabel } from "../utils/schedule-time";

type Props = {
    item: ScheduleRowItem;
    timezone: string;
    isSelected?: boolean;
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
    onClick,
    onPointerDown,
    resizeEnabled = false,
}: Props) {
    const isTask = item.itemType === "task";
    const accent = isTask
        ? item.completed
            ? "#64748b"
            : "#d97706"
        : item.colorTag ?? "#0f766e";
    const title = isTask ? item.title : item.serviceName ?? "Job";
    const subtitle = isTask ? item.customerName : item.clientName;

    return (
        <button
            type="button"
            data-schedule-card="true"
            onClick={() => onClick?.(item)}
            onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("[data-resize-handle='true']")) return;
                onPointerDown?.(item, "move", e);
            }}
            className={[
                "absolute h-11 overflow-hidden rounded-lg border border-slate-200 px-3 text-left text-xs shadow-sm transition select-none",
                isTask
                    ? item.completed
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-50/80 text-slate-900 hover:bg-amber-50"
                    : "bg-white",
                isSelected ? "ring-2 ring-slate-300" : "hover:border-slate-300",
            ].join(" ")}
            style={{
                left: `${item.left}px`,
                top: `${item.top}px`,
                width: `${item.width}px`,
                borderLeftWidth: "4px",
                borderLeftColor: accent,
            }}
            title={`${title} ${formatTimeLabel(item.startAt, timezone)}${subtitle ? ` - ${subtitle}` : ""}`}
        >
            <div className="truncate font-medium text-slate-900">{title}</div>

            <div className="truncate text-[11px] text-slate-500">
                {formatTimeLabel(item.startAt, timezone)}
                {subtitle ? ` • ${subtitle}` : ""}
            </div>

            <div
                data-resize-handle="true"
                onPointerDown={(e) => {
                    if (!resizeEnabled) return;
                    e.stopPropagation();
                    onPointerDown?.(item, "resize-end", e);
                }}
                className={[
                    "absolute right-0 top-0 h-full w-2 rounded-r-md",
                    resizeEnabled
                        ? "cursor-ew-resize hover:bg-sky-300/40"
                        : "pointer-events-none opacity-0",
                ].join(" ")}
            />
        </button>
    );
}
