// src/features/services/components/ServiceFormDialog.tsx
import type { ServiceCreateInput, ServiceDto } from "../api/services.types";
import { ServiceForm } from "./ServiceForm";

export function ServiceFormDialog(props: {
    open: boolean;
    title: string;
    initial?: ServiceDto | null;
    onClose: () => void;
    onSubmit: (payload: ServiceCreateInput) => void;
    isSubmitting?: boolean;
}) {
    const { open, title, initial, onClose, onSubmit, isSubmitting } = props;
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
                        ✕
                    </button>
                </div>

                <div className="p-5">
                    <ServiceForm initial={initial} onCancel={onClose} onSubmit={onSubmit} isSubmitting={isSubmitting} />
                </div>
            </div>
        </div>
    );
}
