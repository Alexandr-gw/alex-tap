import {
    CalendarDays,
    CreditCard,
    Bell,
    Github,
    ShieldCheck,
    Database,
    Workflow,
    Layers3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { startLogin } from "@/features/auth/api/auth.api";
import landingSchedulePreview from "../images/landing-schedule-preview.png";

const featureCards = [
    {
        icon: CalendarDays,
        title: "Scheduling",
        desc: "Real-time slots, worker assignment, and a clean calendar workflow for day-to-day operations.",
    },
    {
        icon: CreditCard,
        title: "Payments",
        desc: "Stripe checkout connected to the booking flow with clear payment status and follow-through.",
    },
    {
        icon: Bell,
        title: "Notifications",
        desc: "Confirmation emails and reminders that support the workflow instead of adding noise.",
    },
];

const stackItems = [
    { icon: Layers3, label: "NestJS" },
    { icon: Database, label: "Prisma" },
    { icon: ShieldCheck, label: "Keycloak" },
    { icon: CreditCard, label: "Stripe" },
    { icon: Workflow, label: "Redis" },
];

export function LandingPage() {
    return (
        <div className="min-h-dvh bg-[linear-gradient(180deg,#f6fbf9_0%,#f8fbff_38%,#ffffff_100%)] text-slate-900">
            <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/85 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#91d6b6_0%,#8cc7ff_100%)] text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(140,199,255,0.22)]">
                            A
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-950">Alex Tap Home Services</div>
                            <div className="text-xs text-slate-500">Service operations platform</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/architecture"
                            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            Architecture
                        </Link>
                        <button
                            type="button"
                            onClick={() => void startLogin("/app")}
                            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            Open App
                        </button>

                        <a
                            href="https://github.com/Alexandr-gw/alex-tap"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </a>
                    </div>
                </div>
            </header>

            <main>
                <section className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Built for small service teams
                            </p>

                            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                                Service scheduling, payments, and team workflow in one place.
                            </h1>

                            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                Alex Tap is a field-service platform focused on the core customer and team flow: booking, assignment,
                                payment, reminders, and a clear job lifecycle from request to completion.
                            </p>

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    to="/architecture"
                                    className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                                >
                                    View architecture
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => void startLogin("/app")}
                            className="rounded-2xl border border-emerald-500 bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,185,129,0.22)] transition hover:border-emerald-600 hover:bg-emerald-600"
                                >
                                    Open App
                                </button>

                                <a
                                    href="https://github.com/Alexandr-gw/alex-tap"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                                >
                                    <Github className="h-4 w-4" />
                                    GitHub
                                </a>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(145,214,182,0.22),_transparent_50%),radial-gradient(circle_at_bottom_right,_rgba(140,199,255,0.26),_transparent_58%)] blur-2xl" />

                            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Scheduling board</div>
                                            <div className="text-xs text-slate-500">Live schedule preview</div>
                                        </div>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            Staff workflow
                                        </span>
                                    </div>

                                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                                        <img
                                            src={landingSchedulePreview}
                                            alt="Alex Tap scheduling board preview"
                                            className="h-auto w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Built with
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                    A compact stack for auth, scheduling, payments, and async workflows.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {stackItems.map(({ icon: Icon, label }) => (
                                    <span
                                        key={label}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                                    >
                    <Icon className="h-4 w-4" />
                                        {label}
                  </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">What it does well</h2>
                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            {featureCards.map(({ icon: Icon, title, desc }) => (
                                <div
                                    key={title}
                                    className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                                >
                                    <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="mt-4 text-lg font-semibold text-slate-950">{title}</div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-screen-xl px-4 pb-16 pt-2 sm:px-6 sm:pb-20">
                    <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div>Built as a focused service operations platform for small field teams.</div>
                        <div className="flex flex-wrap items-center gap-4">
                            <a
                                href="https://github.com/Alexandr-gw/alex-tap"
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-slate-700 transition hover:text-slate-950"
                            >
                                GitHub
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
