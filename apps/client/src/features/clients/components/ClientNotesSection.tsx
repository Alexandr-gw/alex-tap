import { formatDateTime } from "./formatters";

type Props = {
    notes?: string | null;
    updatedAt?: string | null;
    onEdit: () => void;
};

export function ClientNotesSection({ notes, updatedAt, onEdit }: Props) {
    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Internal notes</h2>
                    <p className="text-sm text-slate-500">
                        Shared staff-only notes for this client.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Edit notes
                </button>
            </div>

            {notes?.trim() ? (
                <div className="rounded-xl border p-4">
                    <div className="text-xs text-slate-500">Updated {formatDateTime(updatedAt)}</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{notes}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
                    No internal notes yet.
                </div>
            )}
        </section>
    );
}
