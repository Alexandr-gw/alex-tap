import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { isApiError } from "@/lib/api/apiError";
import { useBookingWizard } from "../hooks/useBookingWizard";
import { usePublicServices } from "../hooks/booking.queries";
import { BookingNotFoundPage } from "./BookingNotFoundPage";
import { StepService } from "../steps/StepService";
import { StepDateTimePicker } from "../steps/StepDateTimePicker.tsx";
import { StepClientDetails } from "../steps/StepClientDetails";
import { StepConfirm } from "../steps/StepConfirm";
import type { WizardStepId } from "../booking.types";

const ROADMAP_STEPS: Array<{
    id: WizardStepId;
    label: string;
    title: string;
    description: string;
}> = [
    {
        id: "service",
        label: "Service",
        title: "Choose your service",
        description: "Pick the job you want the team to handle so we can guide you to the right appointment.",
    },
    {
        id: "datetime",
        label: "Time",
        title: "Pick a date and time",
        description: "Choose the appointment window that works best for you in your local timezone.",
    },
    {
        id: "client",
        label: "Details",
        title: "Share your details",
        description: "Tell us how to contact you and where the visit should happen.",
    },
    {
        id: "confirm",
        label: "Confirm",
        title: "Review and book",
        description: "Double-check everything, then confirm and pay to lock it in.",
    },
];

function BookingRoadmap({ stepId }: { stepId: WizardStepId }) {
    const currentIndex = ROADMAP_STEPS.findIndex((step) => step.id === stepId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const progressPercent =
        ROADMAP_STEPS.length <= 1 ? 0 : (safeIndex / (ROADMAP_STEPS.length - 1)) * 100;
    const currentStep = ROADMAP_STEPS[safeIndex];

    return (
        <aside className="rounded-[28px] border border-sky-100/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(14,116,144,0.10)] backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/75">
                        Booking roadmap
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                        {currentStep.title}
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
                        {currentStep.description}
                    </p>
                </div>

                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 w-[40%]">
                    Step {safeIndex + 1} of {ROADMAP_STEPS.length}
                </div>
            </div>

            <div className="relative mt-8">
                <div className="absolute left-[23px] top-4 h-[calc(100%-2rem)] w-px bg-slate-200" />
                <div
                    className="absolute left-[23px] top-4 w-px rounded-full bg-gradient-to-b from-emerald-400 via-sky-500 to-sky-500 transition-[height] duration-500 ease-out"
                    style={{ height: `calc((100% - 2rem) * ${progressPercent / 100})` }}
                />

                <div className="space-y-4">
                    {ROADMAP_STEPS.map((step, index) => {
                        const isDone = index < safeIndex;
                        const isCurrent = index === safeIndex;
                        const stateClasses = isDone
                            ? {
                                  dot: "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_8px_rgba(16,185,129,0.14)]",
                                  card: "border-emerald-200 bg-emerald-50/80",
                                  eyebrow: "text-emerald-700",
                                  title: "text-emerald-950",
                                  body: "text-emerald-900/80",
                              }
                            : isCurrent
                              ? {
                                    dot: "border-sky-500 bg-sky-500 text-white shadow-[0_0_0_8px_rgba(14,165,233,0.14)]",
                                    card: "border-sky-200 bg-sky-50/90",
                                    eyebrow: "text-sky-700",
                                    title: "text-sky-950",
                                    body: "text-sky-900/80",
                                }
                              : {
                                    dot: "border-slate-300 bg-white text-slate-400",
                                    card: "border-slate-200 bg-slate-50/70",
                                    eyebrow: "text-slate-400",
                                    title: "text-slate-500",
                                    body: "text-slate-400",
                                };

                        return (
                            <div key={step.id} className="relative flex gap-4">
                                <div
                                    className={[
                                        "relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300",
                                        stateClasses.dot,
                                    ].join(" ")}
                                >
                                    {index + 1}
                                </div>

                                <div
                                    className={[
                                        "min-w-0 flex-1 rounded-3xl border px-4 py-4 transition-colors duration-300",
                                        stateClasses.card,
                                    ].join(" ")}
                                >
                                    <div
                                        className={[
                                            "text-[11px] font-semibold uppercase tracking-[0.26em]",
                                            stateClasses.eyebrow,
                                        ].join(" ")}
                                    >
                                        {step.label}
                                    </div>
                                    <div className={["mt-2 text-lg font-semibold", stateClasses.title].join(" ")}>
                                        {step.title}
                                    </div>
                                    <p className={["mt-2 text-sm leading-7", stateClasses.body].join(" ")}>
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

function BookingLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="min-h-dvh bg-[linear-gradient(180deg,#f4fbf8_0%,#f7fbff_35%,#ffffff_100%)] px-4 py-16 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
                    <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        Booking unavailable
                    </div>

                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        We could not load this booking page right now.
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                        The booking page may be temporarily unavailable. Please try again in a moment.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function BookingWizardPage() {
    const { companySlug } = useParams();
    const resolvedCompanySlug = companySlug ?? "";
    const wizard = useBookingWizard(resolvedCompanySlug);
    const servicesQ = usePublicServices(companySlug);

    const companyId = servicesQ.data?.companyId;
    const serviceId = wizard.draft.serviceId;
    const resumeServiceId = wizard.savedDraft?.serviceId ?? null;
    const isNotFound = servicesQ.isError && isApiError(servicesQ.error) && servicesQ.error.status === 404;

    const selectedService = useMemo(() => {
        if (!servicesQ.data?.services || !serviceId) return undefined;
        return servicesQ.data.services.find((s) => s.id === serviceId);
    }, [servicesQ.data, serviceId]);

    const resumeService = useMemo(() => {
        if (!servicesQ.data?.services || !resumeServiceId) return undefined;
        return servicesQ.data.services.find((s) => s.id === resumeServiceId);
    }, [servicesQ.data, resumeServiceId]);

    const content = useMemo(() => {
        switch (wizard.stepId) {
            case "service":
                return (
                    <StepService
                        wizard={wizard}
                        servicesQ={servicesQ}
                    />
                );
            case "datetime":
                if (!companyId || !serviceId) return <div>Loading...</div>;
                return <StepDateTimePicker wizard={wizard} companyId={companyId} serviceId={serviceId} />;
            case "client":
                return <StepClientDetails wizard={wizard} />;
            case "confirm":
                if (!companyId || !serviceId || !selectedService) return <div>Loading...</div>;
                return (
                    <StepConfirm
                        wizard={wizard}
                        companyId={companyId}
                        companySlug={resolvedCompanySlug}
                        serviceId={serviceId}
                        selectedService={selectedService}
                    />
                );
            default:
                return null;
        }
    }, [wizard, servicesQ, companyId, serviceId, selectedService, resolvedCompanySlug]);

    if (!companySlug) {
        return <div className="p-6">Missing company.</div>;
    }

    if (isNotFound) {
        return <BookingNotFoundPage companySlug={companySlug} />;
    }

    if (servicesQ.isError) {
        return <BookingLoadError onRetry={() => void servicesQ.refetch()} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.55),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(220,252,231,0.65),_transparent_30%),linear-gradient(180deg,_#f8fcff_0%,_#f8fafc_100%)]">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
                <div className="mb-6">
                    <div className="text-sm text-slate-600">Booking</div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                        {servicesQ.data?.companyName ?? "Loading..."}
                    </h1>
                    {selectedService && (
                        <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
                            Selected: {selectedService.name}
                        </div>
                    )}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-5">
                        {wizard.resumeChoiceRequired ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-lg font-semibold text-slate-900">Continue your saved booking?</div>
                                    <p className="mt-1 text-sm text-slate-600">
                                        We found a booking started in the last 24 hours. You can continue where you left off or start a new booking.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                    {resumeService ? <div>Service: {resumeService.name}</div> : null}
                                    {wizard.savedDraft?.slot ? (
                                        <div>Selected time: {new Date(wizard.savedDraft.slot.start).toLocaleString()}</div>
                                    ) : null}
                                    {wizard.savedDraft?.client?.name ? (
                                        <div>Customer: {wizard.savedDraft.client.name}</div>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-white sm:w-auto"
                                        onClick={wizard.continueSavedDraft}
                                    >
                                        Continue booking
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2 sm:w-auto"
                                        onClick={wizard.startFresh}
                                    >
                                        Start new booking
                                    </button>
                                </div>
                            </div>
                        ) : (
                            content
                        )}
                    </div>

                    <BookingRoadmap stepId={wizard.stepId} />
                </div>
            </div>
        </div>
    );
}
