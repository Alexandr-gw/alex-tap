import { api } from "@/lib/api/apiClient";
import type {
    PublicServiceDto,
    PublicSlotsResponse,
    CreateCheckoutInput,
    CreateCheckoutResponse,
    PublicServicesListDto,
} from "./booking.types";

export function getPublicService(companySlug: string, serviceSlug: string) {
    return api<PublicServiceDto>(
        `/api/api/v1/public/companies/${companySlug}/services/${serviceSlug}`,
    );
}

export function listPublicServices(companySlug: string) {
    return api<PublicServicesListDto>(`/api/api/v1/public/companies/${companySlug}/services`);
}

export type GetPublicSlotsParams = {
    companyId: string;
    serviceId: string;
    from: string; // ISO date
    to: string;   // ISO date
};

export function getPublicSlots(params: GetPublicSlotsParams) {
    const qs = new URLSearchParams({
        companyId: params.companyId,
        serviceId: params.serviceId,
        from: params.from,
        to: params.to,
    }).toString();

    return api<PublicSlotsResponse>(`/api/api/v1/public/slots?${qs}`, {
        // optional: prevent x-company-id header being added for public calls
        companyId: null,
    });
}

export function createCheckout(input: CreateCheckoutInput) {
    return api<CreateCheckoutResponse>(`/api/api/v1/public/bookings/checkout`, {
        method: "POST",
        body: input,
        companyId: null, // optional (same reason)
    });
}