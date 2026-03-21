type Props = {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export function ClientsPagination({ page, totalPages, onPageChange }: Props) {
    if (totalPages <= 1) return null;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i += 1) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm">
            <button
                type="button"
                onClick={() => canPrev && onPageChange(page - 1)}
                disabled={!canPrev}
                className="rounded-xl border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
                Previous
            </button>

            <div className="flex items-center gap-2">
                {pages.map((p) => {
                    const active = p === page;

                    return (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-medium transition ${
                                active
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            {p}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={() => canNext && onPageChange(page + 1)}
                disabled={!canNext}
                className="rounded-xl border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
}