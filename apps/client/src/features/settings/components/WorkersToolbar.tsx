import { useEffect, useState } from "react";

type Props = {
    value: string;
    onSearchChange: (value: string) => void;
    onCreateClick: () => void;
};

export function WorkersToolbar({ value, onSearchChange, onCreateClick }: Props) {
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            onSearchChange(draft);
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [draft, onSearchChange]);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
                type="button"
                onClick={onCreateClick}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
                Add worker
            </button>

            <div className="w-full sm:ml-auto sm:max-w-md">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Search by name, phone, or linked email"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
            </div>
        </div>
    );
}
