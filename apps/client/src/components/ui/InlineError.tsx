// src/components/ui/InlineError.tsx
export function InlineError({
                                message = "Something went wrong.",
                                onRetry,
                            }: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-sm text-red-700">{message}</div>
            {onRetry ? (
                <button
                    onClick={onRetry}
                    className="mt-3 inline-flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                    Retry
                </button>
            ) : null}
        </div>
    );
}
