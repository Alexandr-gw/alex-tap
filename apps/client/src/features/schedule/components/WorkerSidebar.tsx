import { WORKER_SIDEBAR_WIDTH, type ScheduleWorkerRow } from "../utils/schedule-row-layout";

type Props = {
    rows: ScheduleWorkerRow[];
};

export function WorkerSidebar({ rows }: Props) {
    return (
        <aside
            className="shrink-0 border-r border-slate-200 bg-white"
            style={{ width: `${WORKER_SIDEBAR_WIDTH}px` }}
        >
            {rows.map((row, rowIndex) => (
                <div
                    key={row.worker.id}
                    className={[
                        "flex items-center justify-between border-b border-slate-200 px-4 text-sm",
                        rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                    ].join(" ")}
                    style={{ height: `${row.rowHeight}px` }}
                >
                    <span className="truncate pr-3 font-medium text-slate-900">{row.worker.name}</span>
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                        {row.completed}/{row.total}
                    </span>
                </div>
            ))}
        </aside>
    );
}
