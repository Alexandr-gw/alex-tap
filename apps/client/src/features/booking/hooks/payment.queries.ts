import { useQuery } from "@tanstack/react-query";
import {
    getPrivateCheckoutSessionSummary,
    getPublicCheckoutSessionSummary,
} from "@/features/booking/api/payment.api";
import type { PaymentSessionSummaryDto } from "@/features/booking/api/booking.types";

type CheckoutSessionSummaryMode = "auto" | "public" | "private";

function isAuthError(e: any) {
    const status = e?.status ?? e?.response?.status;
    return status === 401 || status === 403;
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

            // auto mode: private first, fallback to public on auth failure
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
            if (!data) return 1500;

            return data.status === "SUCCEEDED" || data.status === "FAILED"
                ? false
                : 1500;
        },
        retry: (count, err) => {
            if (isAuthError(err)) return false;
            return count < 2;
        },
    });
}
