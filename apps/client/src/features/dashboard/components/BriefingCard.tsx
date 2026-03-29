import { useState } from "react";
import { ChevronDown, Sparkles, Stars } from "lucide-react";
import type { DashboardBriefingDto } from "@/features/dashboard/api/dashboard.types";

type Props = {
    briefing?: DashboardBriefingDto | null;
    isLoading?: boolean;
    isError?: boolean;
    todayValue: string;
    weekValue: string;
};

export function BriefingCard({
    briefing,
    isLoading = false,
    isError = false,
    todayValue,
    weekValue,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    if (isLoading) {
        return (
            <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(135deg,_#ecfeff,_#eff6ff_58%,_#e0f2fe_140%)] px-4 py-5 text-slate-950 sm:px-5">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="space-y-2 px-5 py-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    ))}
                </div>
            </section>
        );
    }

    if (isError || !briefing) {
        return (
            <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(135deg,_#ecfeff,_#eff6ff_58%,_#dbeafe_140%)] px-4 py-5 text-slate-950 sm:px-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-900">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Briefing
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Dashboard
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        Operations at a glance
                    </div>
                </div>
                <div className="px-4 py-4 sm:px-5">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        Briefing is unavailable right now. The dashboard metrics below are still live.
                    </div>
                </div>
            </section>
        );
    }

    const calmState =
        briefing.briefing.alerts.length === 0 &&
        briefing.briefing.insights.length === 0;
    const previewLines = [
        ...briefing.briefing.alerts.slice(0, 1),
        ...briefing.briefing.insights.slice(0, 1),
    ].slice(0, 2);
    const hasDetails =
        briefing.briefing.alerts.length > 0 ||
        briefing.briefing.insights.length > 0 ||
        calmState;

    return (
        <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.18),_transparent_32%),linear-gradient(135deg,_#f0fdfa,_#eff6ff_48%,_#e0f2fe_100%)] px-4 py-5 text-slate-950 sm:px-5">
                <div className="absolute -right-8 top-0 hidden h-28 w-28 rounded-full bg-cyan-200/40 blur-3xl sm:block" />

                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-900">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Briefing
                        </div>
                        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Dashboard
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                Operations at a glance
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                                <Stars className="h-3.5 w-3.5" />
                                {briefing.source === "AI" ? "AI formatted" : "Rule based"}
                            </span>
                            {briefing.usedFallback ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                                    Fallback
                                </span>
                            ) : null}
                        </div>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Watch today's job load, worker activity, and the issues that need attention before they turn into missed work.
                        </p>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700">
                            {briefing.briefing.summary}
                        </p>
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                        <div className="rounded-[1.75rem] border border-cyan-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Job value today
                            </div>
                            <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                {todayValue}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                                Weekly pipeline {weekValue}
                            </div>
                        </div>

                        {hasDetails ? (
                            <button
                                type="button"
                                onClick={() => setExpanded((current) => !current)}
                                className="flex w-full items-center justify-between rounded-2xl border border-cyan-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                            >
                                <span>{expanded ? "Hide details" : "Show details"}</span>
                                <ChevronDown
                                    className={[
                                        "h-4 w-4 transition",
                                        expanded ? "rotate-180" : "",
                                    ].join(" ")}
                                />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
                {!expanded ? (
                    previewLines.length ? (
                        <div className="flex flex-wrap gap-2">
                            {previewLines.map((line) => (
                                <span
                                    key={line}
                                    className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                                >
                                    {line}
                                </span>
                            ))}
                        </div>
                    ) : calmState ? (
                        <div className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                            Calm state: nothing urgent is standing out right now.
                        </div>
                    ) : null
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            {briefing.briefing.alerts.length ? (
                                briefing.briefing.alerts.map((alert) => (
                                    <div
                                        key={alert}
                                        className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
                                    >
                                        {alert}
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                                    No active alerts right now.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {briefing.briefing.insights.map((insight) => (
                                <div
                                    key={insight}
                                    className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-950"
                                >
                                    {insight}
                                </div>
                            ))}

                            {calmState ? (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                                    Calm state: nothing urgent is standing out right now.
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
