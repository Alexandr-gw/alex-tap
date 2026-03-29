import { useEffect, useState } from "react";

type Props = {
    value: string;
    onSearchChange: (value: string) => void;
    onCreateClick: () => void;
};

export function ClientsToolbar({ value, onSearchChange, onCreateClick }: Props) {
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            onSearchChange(draft);
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [draft, onSearchChange]);

    return (
        <div className="flex flex-col gap-3 rounded-3xl border border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#f6fcf8_52%,#f7fbff_100%)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <button
                type="button"
                onClick={onCreateClick}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-4 text-sm font-medium text-white transition hover:border-emerald-400"
            >
                New Client
            </button>

            <div className="w-full sm:ml-auto sm:max-w-md">
                <input
                    id="clients-search"
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Search by name, phone, email, or address"
                    className="h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none ring-0 transition focus:border-sky-300"
                />
            </div>
        </div>
    );
}
