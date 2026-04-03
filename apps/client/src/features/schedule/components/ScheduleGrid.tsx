import { useEffect, useRef } from "react";
import type * as React from "react";
import type { ScheduleRowItem } from "../types/schedule-ui.types";
import { ScheduleCard } from "./ScheduleCard";
import { CurrentTimeLine } from "./CurrentTimeLine";
import {
    HOUR_WIDTH,
    PX_PER_MINUTE,
    durationToWidth,
    getCurrentMinutes,
    getTodayDate,
    minutesToLeft,
} from "../utils/schedule-time";
import type { ScheduleWorkerRow } from "../utils/schedule-row-layout";
import {
    getSavedScheduleScrollX,
    saveScheduleScrollX,
} from "../utils/schedule-storage";

type Props = {
    date: string;
    timezone: string;
    rows: ScheduleWorkerRow[];
    selectedItemId?: string | null;
    syncingItemId?: string | null;
    onSelectItem?: (item: ScheduleRowItem) => void;
    onEmptySlotClick?: (payload: {
        workerId: string;
        startMinutes: number;
        clientX: number;
        clientY: number;
    }) => void;
    onScrollLeftChange?: (value: number) => void;
    dragPreviewById?: Record<
        string,
        {
            startMinutes: number;
            endMinutes: number;
        }
    >;
    onCardPointerDown?: (
        item: ScheduleRowItem,
        mode: "move" | "resize-end",
        e: React.PointerEvent<HTMLButtonElement | HTMLDivElement>
    ) => void;
};

function snapMinutes(minutes: number, step = 15) {
    return Math.max(0, Math.min(24 * 60, Math.round(minutes / step) * step));
}

export function ScheduleGrid({
    date,
    timezone,
    rows,
    selectedItemId,
    syncingItemId,
    onSelectItem,
    onEmptySlotClick,
    onScrollLeftChange,
    dragPreviewById,
    onCardPointerDown,
}: Props) {
    const fullDayWidth = 24 * HOUR_WIDTH;
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const didInitScrollRef = useRef(false);
    const showCurrentTimeLine = getTodayDate(timezone) === date;
    const currentTimeLeft = minutesToLeft(getCurrentMinutes(timezone));

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || didInitScrollRef.current) return;

        const savedScrollX = getSavedScheduleScrollX();

        if (savedScrollX !== null) {
            el.scrollLeft = savedScrollX;
            onScrollLeftChange?.(savedScrollX);
        } else {
            const currentLeft = minutesToLeft(getCurrentMinutes(timezone));
            const centered = Math.max(0, currentLeft - el.clientWidth / 2);
            el.scrollLeft = centered;
            onScrollLeftChange?.(centered);
        }

        didInitScrollRef.current = true;
    }, [onScrollLeftChange, timezone]);

    function handleScroll() {
        const el = scrollRef.current;
        if (!el) return;

        saveScheduleScrollX(el.scrollLeft);
        onScrollLeftChange?.(el.scrollLeft);
    }

    function handleRowClick(e: React.MouseEvent<HTMLDivElement>, workerId: string) {
        if (!onEmptySlotClick) return;

        const target = e.target as HTMLElement;
        if (target.closest("[data-schedule-card='true']")) return;

        const rowRect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rowRect.left;
        const rawMinutes = x / PX_PER_MINUTE;
        const startMinutes = snapMinutes(rawMinutes, 15);

        onEmptySlotClick({
            workerId,
            startMinutes,
            clientX: e.clientX,
            clientY: e.clientY,
        });
    }

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-auto bg-white"
            onScroll={handleScroll}
        >
            <div style={{ width: `${fullDayWidth}px` }}>
                {rows.map((row, rowIndex) => (
                    <div
                        key={row.worker.id}
                        className={`relative border-b border-slate-200 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                        style={{ width: `${fullDayWidth}px`, height: `${row.rowHeight}px` }}
                        onClick={(e) => handleRowClick(e, row.worker.id)}
                    >
                        <div className="pointer-events-none absolute inset-0">
                            {Array.from({ length: 24 }).map((_, hour) => (
                                <div
                                    key={hour}
                                    className="absolute top-0 h-full border-r border-slate-200"
                                    style={{ left: `${hour * HOUR_WIDTH}px` }}
                                />
                            ))}
                        </div>

                        {showCurrentTimeLine ? <CurrentTimeLine left={currentTimeLeft} /> : null}

                        {row.items.map((item) => {
                            const preview = dragPreviewById?.[item.id];
                            const renderedItem = preview
                                ? {
                                      ...item,
                                      startMinutes: preview.startMinutes,
                                      endMinutes: preview.endMinutes,
                                      left: minutesToLeft(preview.startMinutes),
                                      width: durationToWidth(preview.startMinutes, preview.endMinutes),
                                  }
                                : item;

                            return (
                                <ScheduleCard
                                    key={item.id}
                                    item={renderedItem}
                                    timezone={timezone}
                                    isSelected={selectedItemId === item.id}
                                    isSyncing={syncingItemId === item.id}
                                    onClick={onSelectItem}
                                    onPointerDown={onCardPointerDown}
                                    resizeEnabled={item.itemType === "job" || item.itemType === "task"}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
