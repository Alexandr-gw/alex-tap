import {
    ArrowDown,
    ArrowDownLeft,
    ArrowDownRight,
    ArrowRight,
    CreditCard,
    Database,
    Github,
    LockKeyhole,
    Server,
    Smartphone,
    Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

const designDecisions = [
    "Queue async reminders and retries in Redis + BullMQ instead of tying notification delivery to request latency.",
    "Use Stripe webhooks to move payment results back into server-side job state.",
    "Validate booking slots on the server so public booking stays authoritative even if the UI is stale.",
    "Keep authentication external in Keycloak so roles and provider logins stay outside the core app logic.",
];

const systemBlocks = [
    {
        title: "Client (React)",
        notes: ["public booking", "staff dashboard"],
        icon: Smartphone,
        accent: "border-sky-200 bg-sky-50/75",
    },
    {
        title: "NestJS API",
        notes: ["booking logic", "job lifecycle"],
        icon: Server,
        accent: "border-emerald-200 bg-emerald-50/75",
    },
    {
        title: "Postgres + Prisma",
        notes: ["jobs, clients", "tasks, activity"],
        icon: Database,
        accent: "border-slate-200 bg-white",
    },
    {
        title: "Stripe",
        notes: ["checkout", "webhook"],
        icon: CreditCard,
        accent: "border-sky-200 bg-sky-50/75",
    },
    {
        title: "Redis Queue",
        notes: ["reminders", "retries"],
        icon: Workflow,
        accent: "border-emerald-200 bg-emerald-50/75",
    },
    {
        title: "Notification workers",
        notes: ["email", "SMS reminders"],
        icon: Workflow,
        accent: "border-slate-200 bg-white",
    },
];

function DiagramBlock({
    title,
    notes,
    icon: Icon,
    accent,
    className,
}: {
    title: string;
    notes: string[];
    icon: typeof Smartphone;
    accent: string;
    className?: string;
}) {
    return (
        <div className={`rounded-2xl border ${accent} px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${className ?? ""}`}>
            <div className="flex items-center gap-3">
                <span className="inline-flex rounded-xl bg-white/80 p-2 text-slate-700 shadow-sm">
                    <Icon className="h-4 w-4" />
                </span>
                <div className="text-sm font-semibold text-slate-950">{title}</div>
            </div>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                {notes.map((note) => (
                    <li key={note}>- {note}</li>
                ))}
            </ul>
        </div>
    );
}

export function ArchitecturePage() {
    return (
        <div className="min-h-dvh bg-[linear-gradient(180deg,#f4fbf7_0%,#f5fbff_32%,#ffffff_100%)] text-slate-900">
            <header className="border-b border-slate-200/80 bg-white/88">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link to="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                        Alex Tap
                    </Link>

                    <div className="flex items-center gap-4 text-sm">
                        <a
                            href="https://github.com/Alexandr-gw/alex-tap"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-slate-600 transition hover:text-slate-950"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </a>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
                <section className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        System architecture
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                        System architecture
                    </h1>
                    <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                        Booking to API to payment to queue to notifications.
                    </p>
                </section>

                <section className="mt-12 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:p-8">
                    <div className="mx-auto hidden max-w-5xl lg:block">
                        <div className="grid grid-cols-[220px_88px_240px_88px_220px] grid-rows-[auto_88px_auto_88px_auto_88px_auto] items-center justify-center">
                            <div className="col-start-3 row-start-1">
                                <DiagramBlock {...systemBlocks[0]} />
                            </div>

                            <div className="col-start-1 row-start-2 flex flex-col items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                <span className="text-center leading-4">Login<br />(OIDC)</span>
                                <ArrowDown className="h-5 w-5 text-slate-400" />
                            </div>

                            <div className="col-start-3 row-start-2 flex flex-col items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                <span className="text-center leading-4">HTTP<br />(JWT)</span>
                                <ArrowDown className="h-5 w-5 text-slate-400" />
                            </div>

                            <div className="col-start-3 row-start-3">
                                <DiagramBlock {...systemBlocks[1]} />
                            </div>

                            <div className="col-start-1 row-start-3">
                                <DiagramBlock
                                    title="Keycloak"
                                    notes={["social login", "role claims"]}
                                    icon={LockKeyhole}
                                    accent="border-sky-200 bg-sky-50/75"
                                />
                            </div>

                            <div className="col-start-2 row-start-3 flex items-center justify-center">
                                <div className="flex w-full flex-col items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    <span className="text-center leading-4">JWT validation<br />(JWKS)</span>
                                    <ArrowRight className="h-5 w-5 rotate-180 text-slate-400" />
                                </div>
                            </div>

                            <div className="col-start-5 row-start-3">
                                <DiagramBlock {...systemBlocks[3]} />
                            </div>

                            <div className="col-start-4 row-start-3 flex items-center justify-center">
                                <div className="flex w-full flex-col items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Checkout</span>
                                        <ArrowRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Webhook</span>
                                        <ArrowRight className="h-5 w-5 rotate-180 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-5 row-start-4 flex justify-center">
                                <div className="flex items-start gap-12">
                                    <div className="flex w-[220px] flex-col items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        <span>Read / write</span>
                                        <ArrowDownLeft className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div className="flex w-[220px] flex-col items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        <span className="text-center leading-4">Enqueue job<br />(async)</span>
                                        <ArrowDownRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-5 row-start-5 flex justify-center">
                                <div className="flex items-start gap-12">
                                    <DiagramBlock {...systemBlocks[2]} className="w-[220px]" />
                                    <DiagramBlock {...systemBlocks[4]} className="w-[220px]" />
                                </div>
                            </div>

                            <div className="col-span-5 row-start-6 flex justify-center">
                                <div className="flex w-[488px] justify-end">
                                    <div className="flex w-[220px] flex-col items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        <ArrowDown className="h-5 w-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-5 row-start-7 flex justify-center">
                                <div className="flex w-[488px] justify-end">
                                    <DiagramBlock {...systemBlocks[5]} className="w-[220px]" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Booking - Payment - Webhook - Queue - Notification
                        </div>
                    </div>

                    <div className="mx-auto grid max-w-xl gap-3 lg:hidden">
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[0]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span className="text-center leading-4">Login<br />(OIDC)</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock
                                title="Keycloak"
                                notes={["social login", "role claims"]}
                                icon={LockKeyhole}
                                accent="border-sky-200 bg-sky-50/75"
                            />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span className="text-center leading-4">HTTP<br />(JWT)</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[1]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span className="text-center leading-4">JWT validation<br />(JWKS)</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock
                                title="Keycloak"
                                notes={["token checks", "role claims"]}
                                icon={LockKeyhole}
                                accent="border-sky-200 bg-sky-50/75"
                            />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span>Read / write</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[2]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span>Checkout</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[3]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span>Webhook</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[1]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <span className="text-center leading-4">Enqueue job<br />(async)</span>
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[4]} />
                        </div>
                        <div className="flex flex-col items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            <ArrowDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="mx-auto w-full max-w-xs">
                            <DiagramBlock {...systemBlocks[5]} />
                        </div>
                        <div className="border-t border-slate-200 pt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Booking - Payment - Webhook - Queue - Notification
                        </div>
                    </div>
                </section>

                <section className="mt-10 max-w-4xl">
                    <div>
                        <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Design decisions
                        </h2>
                        <ul className="mt-4 space-y-3">
                            {designDecisions.map((item) => (
                                <li
                                    key={item}
                                    className="border-l-2 border-emerald-200 pl-4 text-sm leading-6 text-slate-700"
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </main>
        </div>
    );
}
