// src/components/table/Pagination.tsx
export function Pagination({
                               canPrev,
                               canNext,
                               onPrev,
                               onNext,
                               label,
                           }: {
    canPrev: boolean;
    canNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    label?: string;
}) {
    return (
        <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">{label ?? ""}</div>
            <div className="flex gap-2">
                <button
                    onClick={onPrev}
                    disabled={!canPrev}
                    className="h-9 rounded-md px-3 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                    Prev
                </button>
                <button
                    onClick={onNext}
                    disabled={!canNext}
                    className="h-9 rounded-md px-3 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
