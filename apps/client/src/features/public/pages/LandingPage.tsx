import { NavLink } from "react-router-dom"

const features = [
    { title: "Schedule Jobs", desc: "Plan routes and assign work in minutes.", icon: "📅" },
    { title: "Send Invoices", desc: "Invoice fast with clean templates.", icon: "🧾" },
    { title: "Get Paid Fast", desc: "Accept card payments and track status.", icon: "💳" },
    { title: "Track Your Team", desc: "See who’s where and what’s next.", icon: "📍" },
]

const industries = ["Plumbers", "Electricians", "Cleaning services", "HVAC", "Landscaping"]

const steps = [
    { title: "Create your account", desc: "Set up your company in a minute." },
    { title: "Add your jobs", desc: "Schedule work, assign staff, and track progress." },
    { title: "Get paid", desc: "Invoice customers and collect payments faster." },
]

export function LandingPage() {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            {/* Top bar (public) */}
            <header className="border-b">
                <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-muted" />
                        <div className="text-sm font-semibold">Ghost Route</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NavLink
                            to="/login"
                            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        >
                            Log In
                        </NavLink>

                        <NavLink
                            to="/dashboard"
                            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                        >
                            Get Started Free
                        </NavLink>
                    </div>
                </div>
            </header>

            {/* 1) HERO */}
            <section className="mx-auto max-w-screen-2xl px-4 py-12">
                <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                    {/* Left */}
                    <div>
                        <p className="mb-3 inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            Built for field service teams
                        </p>

                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Run your service business from one app
                        </h1>

                        <p className="mt-4 max-w-xl text-muted-foreground">
                            Scheduling, invoicing, payments, and job tracking for field service teams.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <NavLink
                                to="/dashboard"
                                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                            >
                                Get Started Free
                            </NavLink>

                            <NavLink
                                to="/login"
                                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                            >
                                Log In
                            </NavLink>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border px-3 py-1">Scheduling</span>
                            <span className="rounded-full border px-3 py-1">Invoices</span>
                            <span className="rounded-full border px-3 py-1">Payments</span>
                            <span className="rounded-full border px-3 py-1">Live tracking</span>
                        </div>
                    </div>

                    {/* Right (screenshot placeholder) */}
                    <div className="relative">
                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="aspect-[16/10] rounded-lg bg-muted" />
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="h-16 rounded-lg bg-muted" />
                                <div className="h-16 rounded-lg bg-muted" />
                                <div className="h-16 rounded-lg bg-muted" />
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Screenshot / demo preview placeholder (we’ll replace with real UI later).
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2) What the App Does */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold">What it does</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Everything you need to run jobs end-to-end.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((f) => (
                        <div key={f.title} className="rounded-xl border p-4">
                            <div className="text-2xl">{f.icon}</div>
                            <div className="mt-2 text-sm font-medium">{f.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3) Who It’s For */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold">Who it’s for</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Built for small and growing service businesses.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {industries.map((i) => (
                        <div key={i} className="rounded-xl border p-4 text-sm font-medium">
                            {i}
                        </div>
                    ))}
                </div>
            </section>

            {/* 4) How It Works */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <h2 className="text-lg font-semibold">How it works</h2>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {steps.map((s, idx) => (
                        <div key={s.title} className="rounded-xl border p-4">
                            <div className="text-xs text-muted-foreground">Step {idx + 1}</div>
                            <div className="mt-1 text-sm font-medium">{s.title}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5) Social Proof (placeholders) */}
            <section className="mx-auto max-w-screen-2xl px-4 py-10">
                <div className="rounded-xl border p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium">⭐⭐⭐⭐⭐ “Saved me 10 hours a week”</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Social proof placeholders (swap with real testimonials later).
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">Used by 500+ service pros</div>
                    </div>
                </div>
            </section>

            {/* 6) CTA Again */}
            <section className="mx-auto max-w-screen-2xl px-4 py-12">
                <div className="rounded-xl border p-8">
                    <div className="text-xl font-semibold">Ready to run jobs faster?</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        Start your free trial — no setup headaches.
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <NavLink
                            to="/dashboard"
                            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                        >
                            Start Free Trial
                        </NavLink>

                        <div className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <NavLink to="/login" className="underline underline-offset-4">
                                Log In
                            </NavLink>
                        </div>
                    </div>
                </div>
            </section>

            {/* Public footer */}
            <footer className="border-t">
                <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-4 text-xs text-muted-foreground">
                    <span>© {new Date().getFullYear()} Ghost Route</span>
                    <span>Privacy • Terms</span>
                </div>
            </footer>
        </div>
    )
}