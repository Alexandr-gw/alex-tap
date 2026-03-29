import { HOUR_WIDTH } from "../utils/schedule-time";

function formatHourLabel(hour: number) {
    const normalized = hour % 12 || 12;
    const suffix = hour < 12 ? "AM" : "PM";
    return `${normalized} ${suffix}`;
}

type Props = {
    scrollLeft?: number;
};

export function TimeHeader({ scrollLeft = 0 }: Props) {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="relative h-11 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div
                className="relative h-full will-change-transform"
                style={{
                    width: `${24 * HOUR_WIDTH + 1}px`,
                    transform: `translateX(calc(-${scrollLeft}px - 1px))`,
                }}
            >
                {hours.map((hour) => (
                    <div
                        key={`line-${hour}`}
                        className="absolute inset-y-0 border-l border-slate-200"
                        style={{ left: `${hour * HOUR_WIDTH}px` }}
                    />
                ))}

                <div
                    className="absolute inset-y-0 border-r border-slate-200"
                    style={{ left: `${24 * HOUR_WIDTH}px` }}
                />

                {hours.map((hour) => (
                    <div
                        key={hour}
                        className="absolute inset-y-0 flex items-center px-3 text-[11px] font-semibold text-slate-600"
                        style={{ left: `${hour * HOUR_WIDTH}px`, width: `${HOUR_WIDTH}px` }}
                    >
                        {formatHourLabel(hour)}
                    </div>
                ))}
            </div>
        </div>
    );
}
