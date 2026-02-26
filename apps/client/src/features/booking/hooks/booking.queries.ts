import { useMutation, useQuery } from "@tanstack/react-query";
import {
    createCheckout,
    getPublicSlots,
    type GetPublicSlotsParams,
} from "../api/booking.api";
import { listPublicServices } from "../api/booking.api";

export function usePublicServices(companySlug: string) {
    return useQuery({
        queryKey: ["publicServices", companySlug],
        queryFn: () => listPublicServices(companySlug),
        enabled: Boolean(companySlug),
    });
}

export function usePublicSlots(params: GetPublicSlotsParams | null) {
    return useQuery({
        queryKey: params
            ? ["publicSlots", params.companyId, params.serviceId, params.from, params.to]
            : ["publicSlots", "disabled"],
        queryFn: () => {
            if (!params) throw new Error("Slots query called without params");
            return getPublicSlots(params);
        },
        enabled: Boolean(params?.companyId && params?.serviceId && params?.from && params?.to),
    });
}

export function useCreateCheckout() {
    return useMutation({
        mutationFn: createCheckout,
    });
}