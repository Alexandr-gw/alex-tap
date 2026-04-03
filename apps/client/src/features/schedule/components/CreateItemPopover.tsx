type Props = {
    open: boolean;
    x: number;
    y: number;
    onCreateJob: () => void;
    onCreateTask: () => void;
    onClose: () => void;
};

export function CreateItemPopover({
    open,
    x,
    y,
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
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={onCreateJob}
                        className="rounded px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                        Create job
                    </button>

                    <button
                        type="button"
                        onClick={onCreateTask}
                        className="rounded px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                        Create task
                    </button>
                </div>
            </div>
        </>
    );
}
