// src/components/ui/ConfirmDialog.tsx
type Props = {
    open: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmDialog({
                                  open,
                                  title = "Are you sure?",
                                  description,
                                  confirmText = "Confirm",
                                  cancelText = "Cancel",
                                  danger,
                                  loading,
                                  onConfirm,
                                  onCancel,
                              }: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow">
                <div className="text-base font-semibold text-slate-900">{title}</div>
                {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 rounded-md px-3 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={[
                            "h-9 rounded-md px-3 text-sm font-medium text-white",
                            danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800",
                            loading ? "opacity-70" : "",
                        ].join(" ")}
                        disabled={loading}
                    >
                        {loading ? "Working…" : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
