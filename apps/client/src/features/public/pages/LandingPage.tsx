import { NavLink } from "react-router-dom";
import { startLogin } from "@/features/auth/api/auth.api.ts";

const features = [
    { title: "Schedule Jobs", desc: "Plan routes and assign work in minutes.", icon: "📅" },
    { title: "Send Invoices", desc: "Invoice fast with clean templates.", icon: "🧾" },
    { title: "Get Paid Fast", desc: "Accept card payments and track status.", icon: "💳" },
    { title: "Track Your Team", desc: "See who’s where and what’s next.", icon: "📍" },
];

const industries = ["Plumbers", "Electricians", "Cleaning services", "HVAC", "Landscaping"];

const steps = [
    { title: "Create your account", desc: "Set up your company in a minute." },
    { title: "Add your jobs", desc: "Schedule work, assign staff, and track progress." },
    { title: "Get paid", desc: "Invoice customers and collect payments faster." },
];

export function LandingPage() {
    return (
        <div className="min-h-dvh bg-slate-50 text-slate-900">
            {/* Top bar (public) */}
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                            A
                        </div>
                        <div className="text-sm font-semibold">Alex-tap</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void startLogin("/app")}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                            Log In
                        </button>

                        <NavLink
                            to="/dashboard"
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                            Get Started Free
                        </NavLink>
                    </div>
                </div>
            </header>

            {/* 1) HERO */}
            <section className="mx-auto max-w-screen-2xl px-4 py-12 sm:py-16">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    {/* Left */}
                    <div>
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-indigo-600" />
                            Built for field service teams
                        </p>

                        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                            Run your service business from one app
                        </h1>

                        <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                            Scheduling, invoicing, payments, and job tracking for field service teams.
                        </p>

                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <NavLink
                                to="/dashboard"
                                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                Get Started Free
                            </NavLink>

                            <button
                                type="button"
                                onClick={() => void startLogin("/app")}
                                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
                            >
                                Log In
                            </button>
                        </div>

                        <div className="mt-7 flex flex-wrap gap-2 text-xs text-slate-600">
                            {["Scheduling", "Invoices", "Payments", "Live tracking"].map((t) => (
                                <span
                                    key={t}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm"
                                >
                  {t}
                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right (screenshot placeholder) */}
                    <div className="relative">
                        {/* soft glow */}
                        <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-indigo-200/40 via-transparent to-slate-200/30 blur-2xl" />

                        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="aspect-[16/10] rounded-xl border border-slate-200 bg-slate-100" />

                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="h-16 rounded-xl border border-slate-200 bg-slate-100" />
                                <div className="h-16 rounded-xl border border-slate-200 bg-slate-100" />
                                <div className="h-16 rounded-xl border border-slate-200 bg-slate-100" />
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                Screenshot / demo preview placeholder.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2) What the App Does */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold text-slate-900">What it does</h2>
                <p className="mt-1 text-sm text-slate-600">Everything you need to run jobs end-to-end.</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="text-2xl">{f.icon}</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900">{f.title}</div>
                            <div className="mt-1 text-sm text-slate-600">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3) Who It’s For */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold text-slate-900">Who it’s for</h2>
                <p className="mt-1 text-sm text-slate-600">Built for small and growing service businesses.</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {industries.map((i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm"
                        >
                            {i}
                        </div>
                    ))}
                </div>
            </section>

            {/* 4) How It Works */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold text-slate-900">How it works</h2>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {steps.map((s, idx) => (
                        <div
                            key={s.title}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="text-xs font-medium text-slate-500">Step {idx + 1}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{s.title}</div>
                            <div className="mt-1 text-sm text-slate-600">{s.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5) Social Proof (placeholders) */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                ⭐⭐⭐⭐⭐ “Saved me 10 hours a week”
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                                Social proof placeholders (swap with real testimonials later).
                            </div>
                        </div>
                        <div className="text-sm font-medium text-slate-600">Used by 500+ service pros</div>
                    </div>
                </div>
            </section>

            {/* 6) CTA Again */}
            <section className="mx-auto max-w-screen-2xl px-4 py-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="text-xl font-semibold text-slate-900">Ready to run jobs faster?</div>
                    <div className="mt-2 text-sm text-slate-600">
                        Start your free trial — no setup headaches.
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <NavLink
                            to="/dashboard"
                            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                            Start Free Trial
                        </NavLink>

                        <div className="text-sm text-slate-600">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() => void startLogin("/app")}
                                className="font-medium text-indigo-700 underline underline-offset-4"
                            >
                                Log In
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Public footer */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-4 text-xs text-slate-500">
                    <span>© {new Date().getFullYear()} Alex-tap</span>
                    <span>Privacy • Terms</span>
                </div>
            </footer>
        </div>
    );
}
