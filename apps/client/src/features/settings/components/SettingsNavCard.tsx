import { NavLink } from "react-router-dom";

type Props = {
    title: string;
    description: string;
    to: string;
    compact?: boolean;
};

export function SettingsNavCard({ title, description, to, compact = false }: Props) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                [
                    "block rounded-2xl border shadow-sm transition-colors hover:shadow-md",
                    isActive
                        ? "border-emerald-200 bg-emerald-50/80 ring-1 ring-emerald-100"
                        : "bg-white hover:border-slate-300",
                    compact ? "p-4" : "p-5",
                ].join(" ")
            }
        >
            {({ isActive }) => (
                <>
                    <div className="flex items-start justify-between gap-3">
                        <h2 className={["text-lg font-semibold", isActive ? "text-emerald-900" : "text-slate-900"].join(" ")}>
                            {title}
                        </h2>
                        {isActive ? (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                                Active
                            </span>
                        ) : null}
                    </div>
                    <p className={["mt-2 text-sm", isActive ? "text-emerald-800/80" : "text-slate-500"].join(" ")}>
                        {description}
                    </p>
                </>
            )}
        </NavLink>
    );
}