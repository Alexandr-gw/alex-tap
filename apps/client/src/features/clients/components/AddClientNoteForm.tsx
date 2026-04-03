import { useState } from "react";

type Props = {
    onSubmit: (text: string) => Promise<void> | void;
    isSubmitting?: boolean;
};

export function AddClientNoteForm({ onSubmit, isSubmitting = false }: Props) {
    const [text, setText] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const value = text.trim();
        if (!value) return;

        await onSubmit(value);
        setText("");
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-slate-50 p-4">
            <label htmlFor="client-note" className="text-sm font-medium text-slate-700">
                Add internal note
            </label>

            <textarea
                id="client-note"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Leave a note for your team..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-slate-500"
            />

            <div className="mt-3 flex justify-end">
                <button
                    type="submit"
                    disabled={isSubmitting || !text.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Saving..." : "Add note"}
                </button>
            </div>
        </form>
    );
}