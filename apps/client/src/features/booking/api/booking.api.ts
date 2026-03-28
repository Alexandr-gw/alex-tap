import { api } from "@/lib/api/apiClient";
import type {
    PublicServiceDto,
    PublicSlotsResponse,
    CreateCheckoutInput,
    CreateCheckoutResponse,
    PublicServicesListDto,
    PublicBookingDetailsDto,
    RequestBookingChangesInput,
    RequestBookingChangesResponse,
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

export function getPublicBookingDetails(accessToken: string) {
    return api<PublicBookingDetailsDto>(
        `/api/v1/public/bookings/access/${accessToken}`,
        { companyId: null },
    );
}

export function requestPublicBookingChanges(
    accessToken: string,
    input: RequestBookingChangesInput,
) {
    return api<RequestBookingChangesResponse>(
        `/api/v1/public/bookings/access/${accessToken}/request-changes`,
        {
            method: "POST",
            body: input,
            companyId: null,
        },
    );
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
