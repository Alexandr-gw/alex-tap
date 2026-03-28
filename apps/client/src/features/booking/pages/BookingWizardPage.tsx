import {useMemo} from "react";
import {useParams} from "react-router-dom";
import {useBookingWizard} from "../hooks/useBookingWizard";
import {usePublicServices} from "../hooks/booking.queries";
import {StepService} from "../steps/StepService";
import {StepDateTimePicker} from "../steps/StepDateTimePicker.tsx";
import {StepClientDetails} from "../steps/StepClientDetails";
import {StepConfirm} from "../steps/StepConfirm";

export function BookingWizardPage() {
    const {companySlug} = useParams();
    if (!companySlug) return <div className="p-6">Missing company.</div>;

    const wizard = useBookingWizard(companySlug);
    const servicesQ = usePublicServices(companySlug);

    const companyId = servicesQ.data?.companyId;
    const serviceId = wizard.draft.serviceId;
    const resumeServiceId = wizard.savedDraft?.serviceId ?? null;

    const selectedService = useMemo(() => {
        if (!servicesQ.data?.services || !serviceId) return undefined;
        return servicesQ.data.services.find(s => s.id === serviceId);
    }, [servicesQ.data, serviceId]);

    const resumeService = useMemo(() => {
        if (!servicesQ.data?.services || !resumeServiceId) return undefined;
        return servicesQ.data.services.find(s => s.id === resumeServiceId);
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
                return <StepDateTimePicker wizard={wizard} companyId={companyId} serviceId={serviceId}/>;
            case "client":
                return <StepClientDetails wizard={wizard}/>;

            case "confirm":
                if (!companyId || !serviceId || !selectedService) return <div>Loading...</div>;
                return (
                    <StepConfirm
                        wizard={wizard}
                        companyId={companyId}
                        companySlug={companySlug}
                        serviceId={serviceId}
                        selectedService={selectedService}
                    />
                );

            default:
                return null;
        }
    }, [wizard.stepId, wizard, servicesQ, companyId, serviceId, selectedService]);

    return (
        <div className="mx-auto max-w-3xl px-3 py-4 sm:p-6">
            <div className="mb-4">
                <div className="text-sm text-slate-600">Booking</div>
                <h1 className="text-xl font-semibold text-slate-900">
                    {servicesQ.data?.companyName ?? "Loading..."}
                </h1>
                {selectedService && (
                    <div className="text-sm text-slate-600 mt-1">
                        Service: {selectedService.name}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                {wizard.resumeChoiceRequired ? (
                    <div className="space-y-4">
                        <div>
                            <div className="text-lg font-semibold text-slate-900">Continue your saved booking?</div>
                            <p className="mt-1 text-sm text-slate-600">
                                We found a booking started in the last 24 hours. You can continue where you left off or start a new booking.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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
        </div>
    );
}
