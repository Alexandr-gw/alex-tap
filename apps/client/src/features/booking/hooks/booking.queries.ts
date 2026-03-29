import { useMutation, useQuery } from "@tanstack/react-query";
import {
    createCheckout,
    getPublicBookingDetails,
    getPublicSlotsDay,
    listPublicServices,
    requestPublicBookingChanges,
} from "@/features/booking/api/booking.api";
import type {
    CreateCheckoutInput,
    CreateCheckoutResponse,
    PaymentSessionSummaryDto,
    PublicBookingDetailsDto,
    PublicServicesListDto,
    PublicSlotsResponse,
    RequestBookingChangesInput,
    RequestBookingChangesResponse,
} from "@/features/booking/api/booking.types";
import { isApiError } from "@/lib/api/apiError";
import {
    getPrivateCheckoutSessionSummary,
    getPublicCheckoutSessionSummary,
} from "@/features/booking/api/payment.api";

type CheckoutSessionSummaryMode = "auto" | "public" | "private";

function isAuthError(e: any) {
    const status = e?.status ?? e?.response?.status;
    return status === 401 || status === 403;
}

function isTerminalPaymentStatus(status?: string) {
    return (
        status === "SUCCEEDED" ||
        status === "FAILED" ||
        status === "REFUNDED"
    );
}

export function usePublicServices(companySlug: string | null | undefined) {
    return useQuery<PublicServicesListDto>({
        queryKey: ["publicServices", companySlug],
        enabled: !!companySlug,
        queryFn: () => {
            if (!companySlug) throw new Error("Missing companySlug");
            return listPublicServices(companySlug);
        },
        retry: (count, error) => {
            if (isApiError(error) && error.status === 404) {
                return false;
            }
            return count < 2;
        },
    });
}

export function usePublicSlotsDay(
    params: { companyId: string; serviceId: string; day: string } | null
) {
    return useQuery<PublicSlotsResponse>({
        queryKey: [
            "publicSlotsDay",
            params?.companyId,
            params?.serviceId,
            params?.day,
        ],
        enabled: !!params,
        queryFn: () => {
            if (!params) throw new Error("Missing slots params");
            return getPublicSlotsDay(params);
        },
    });
}

export function useCreateCheckout() {
    return useMutation<CreateCheckoutResponse, Error, CreateCheckoutInput>({
        mutationFn: (input) => createCheckout(input),
    });
}

export function usePublicBookingDetails(accessToken: string | null) {
    return useQuery<PublicBookingDetailsDto>({
        queryKey: ["publicBookingDetails", accessToken],
        enabled: !!accessToken,
        queryFn: () => {
            if (!accessToken) throw new Error("Missing access token");
            return getPublicBookingDetails(accessToken);
        },
        retry: false,
    });
}

export function useRequestPublicBookingChanges() {
    return useMutation<
        RequestBookingChangesResponse,
        Error,
        { accessToken: string; input: RequestBookingChangesInput }
    >({
        mutationFn: ({ accessToken, input }) => requestPublicBookingChanges(accessToken, input),
    });
}

export function useCheckoutSessionSummary(
    sessionId: string | null,
    mode: CheckoutSessionSummaryMode = "auto"
) {
    return useQuery<PaymentSessionSummaryDto>({
        queryKey: ["paymentSessionSummary", sessionId, mode],
        enabled: !!sessionId,
        queryFn: async () => {
            if (!sessionId) throw new Error("Missing sessionId");

            if (mode === "public") {
                return await getPublicCheckoutSessionSummary(sessionId);
            }

            if (mode === "private") {
                return await getPrivateCheckoutSessionSummary(sessionId);
            }

            try {
                return await getPrivateCheckoutSessionSummary(sessionId);
            } catch (e) {
                if (isAuthError(e)) {
                    return await getPublicCheckoutSessionSummary(sessionId);
                }
                throw e;
            }
        },
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data) return 2000;
            return isTerminalPaymentStatus(data.status) ? false : 2000;
        },
        retry: (count, err) => {
            if (isAuthError(err)) return false;
            return count < 2;
        },
    });
}
