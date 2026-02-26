import {useMemo} from "react";
import {useParams} from "react-router-dom";
import {useBookingWizard} from "../hooks/useBookingWizard";
import {usePublicServices} from "../hooks/booking.queries";
import {StepService} from "../steps/StepService";
import {StepDateRange} from "../steps/StepDateRange";
import {StepSlotPicker} from "../steps/StepSlotPicker";
import {StepClientDetails} from "../steps/StepClientDetails";
import {StepConfirm} from "../steps/StepConfirm";

export function BookingWizardPage() {
    const {companySlug} = useParams();
    if (!companySlug) return <div className="p-6">Missing company.</div>;

    const wizard = useBookingWizard(companySlug);
    const servicesQ = usePublicServices(companySlug);

    const companyId = servicesQ.data?.companyId;
    const serviceId = wizard.draft.serviceId;

    const selectedService = useMemo(() => {
        if (!servicesQ.data?.services || !serviceId) return undefined;
        return servicesQ.data.services.find(s => s.id === serviceId);
    }, [servicesQ.data, serviceId]);

    const content = useMemo(() => {
        switch (wizard.stepId) {
            case "service":
                return (
                    <StepService
                        wizard={wizard}
                        servicesQ={servicesQ}
                    />
                );

            case "range":
                if (!serviceId) return <div>Please select a service first.</div>;
                return <StepDateRange wizard={wizard}/>;

            case "slot":
                if (!companyId || !serviceId) return <div>Loading…</div>;
                return <StepSlotPicker wizard={wizard} companyId={companyId} serviceId={serviceId}/>;

            case "client":
                return <StepClientDetails wizard={wizard}/>;

            case "confirm":
                if (!companyId || !serviceId || !selectedService) return <div>Loading…</div>;
                return (
                    <StepConfirm
                        wizard={wizard}
                        companyId={companyId}
                        serviceId={serviceId}
                        selectedService={selectedService}
                    />
                );

            default:
                return null;
        }
    }, [wizard.stepId, wizard, servicesQ, companyId, serviceId, selectedService]);

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
            <div className="mb-4">
                <div className="text-sm text-slate-600">Booking</div>
                <h1 className="text-xl font-semibold text-slate-900">
                    {servicesQ.data?.companyName ?? "Loading…"}
                </h1>
                {selectedService && (
                    <div className="text-sm text-slate-600 mt-1">
                        Service: {selectedService.name}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {content}
            </div>
        </div>
    );
}