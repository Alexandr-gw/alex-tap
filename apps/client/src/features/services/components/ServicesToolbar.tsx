// src/features/services/components/ServicesToolbar.tsx
import { useEffect, useMemo, useState } from "react";

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export type ServicesToolbarValue = {
    search: string;
    active: "all" | "active" | "inactive";
    sort: "name" | "-updatedAt" | "basePriceCents" | "durationMins";
};

export function ServicesToolbar(props: {
    value: ServicesToolbarValue;
    onChange: (next: ServicesToolbarValue) => void;
}) {
    const { value, onChange } = props;

    const [searchDraft, setSearchDraft] = useState(value.search);
    const debouncedSearch = useDebounced(searchDraft, 300);

    useEffect(() => {
        if (debouncedSearch !== value.search) onChange({ ...value, search: debouncedSearch });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        setSearchDraft(value.search);
    }, [value.search]);

    const activeLabel = useMemo(() => {
        if (value.active === "active") return "Active";
        if (value.active === "inactive") return "Not available";
        return "All";
    }, [value.active]);

    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex flex-col">
                    <label className="text-xs text-slate-500">Search</label>
                    <input
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        placeholder="Search by name…"
                        className="h-10 w-full md:w-72 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-slate-500">Availability</label>
                    <select
                        value={value.active}
                        onChange={(e) => onChange({ ...value, active: e.target.value as ServicesToolbarValue["active"] })}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Not available</option>
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-slate-500">Sort</label>
                    <select
                        value={value.sort}
                        onChange={(e) => onChange({ ...value, sort: e.target.value as ServicesToolbarValue["sort"] })}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <option value="name">Name (A→Z)</option>
                        <option value="-updatedAt">Recently updated</option>
                        <option value="basePriceCents">Price (low→high)</option>
                        <option value="durationMins">Duration (short→long)</option>
                    </select>
                </div>
            </div>

            <div className="text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Filter: {activeLabel}
        </span>
            </div>
        </div>
    );
}
