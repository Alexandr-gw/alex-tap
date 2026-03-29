import type { ScheduleJobItem } from "../types/schedule-ui.types";
import { formatTimeLabel } from "../utils/schedule-time";

type Props = {
    item: ScheduleJobItem | null;
    timezone: string;
    open: boolean;
    onClose: () => void;
};

export function ScheduleDetailsDrawer({ item, timezone, open, onClose }: Props) {
    if (!open || !item) return null;

    return (
        <div className="w-80 border-l bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Details</h2>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded border px-2 py-1 text-xs"
                >
                    Close
                </button>
            </div>

            <div className="space-y-4 p-4 text-sm">
                <div>
                    <div className="text-xs text-slate-500">Type</div>
                    <div>Job</div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">Title</div>
                    <div>{item.serviceName ?? "Job"}</div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">Client</div>
                    <div>{item.clientName ?? "-"}</div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">Time</div>
                    <div>
                        {formatTimeLabel(item.startAt, timezone)} - {formatTimeLabel(item.endAt, timezone)}
                    </div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">Status</div>
                    <div>{item.status ?? "-"}</div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">Worker</div>
                    <div>{item.workerName ?? "Unassigned"}</div>
                </div>

                <div>
                    <div className="text-xs text-slate-500">ID</div>
                    <div className="break-all text-xs text-slate-600">{item.entityId}</div>
                </div>
            </div>
        </div>
    );
}
