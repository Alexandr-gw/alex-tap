type Props = {
    open: boolean;
    x: number;
    y: number;
    workerName?: string;
    timeLabel?: string;
    onCreateJob: () => void;
    onCreateTask: () => void;
    onClose: () => void;
};

export function CreateItemPopover({
                                      open,
                                      x,
                                      y,
                                      workerName,
                                      timeLabel,
                                      onCreateJob,
                                      onCreateTask,
                                      onClose,
                                  }: Props) {
    if (!open) return null;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={onClose}
                aria-label="Close create menu"
            />

            <div
                className="fixed z-50 w-56 rounded-lg border bg-white p-2 shadow-lg"
                style={{ left: x, top: y }}
            >
                <div className="border-b px-2 pb-2 text-xs text-slate-500">
                    <div>{workerName ?? "Worker"}</div>
                    <div>{timeLabel ?? "Time"}</div>
                </div>

                <div className="mt-2 flex flex-col">
                    <button
                        type="button"
                        onClick={onCreateJob}
                        className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                        Create job
                    </button>

                    <button
                        type="button"
                        onClick={onCreateTask}
                        className="rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                        Create task
                    </button>
                </div>
            </div>
        </>
    );
}