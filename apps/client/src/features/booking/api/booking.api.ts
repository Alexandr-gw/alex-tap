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
        `/api/v1/public/companies/${companySlug}/services/${serviceSlug}`,
    );
}

export function listPublicServices(companySlug: string) {
    return api<PublicServicesListDto>(`/api/v1/public/companies/${companySlug}/services`);
}

export type GetPublicSlotsParams = {
    companyId: string;
    serviceId: string;
    from: string; // ISO date
    to: string;   // ISO date
};

export function createCheckout(input: CreateCheckoutInput) {
    return api<CreateCheckoutResponse>(`/api/v1/public/bookings/checkout`, {
        method: "POST",
        body: input,
        companyId: null,
    });
}

export type GetPublicSlotsDayParams = {
    companyId: string;
    serviceId: string;
    day: string;
};

export function getPublicSlotsDay(params: GetPublicSlotsDayParams) {
    const qs = new URLSearchParams({
        companyId: params.companyId,
        serviceId: params.serviceId,
        day: params.day,
    }).toString();

    return api<PublicSlotsResponse>(`/api/v1/public/slots/day?${qs}`, {
        companyId: null,
    });
}
