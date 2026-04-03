import { api } from "@/lib/api/apiClient";
import type { PaymentSessionSummaryDto } from "@/features/booking/api/booking.types.ts";

export function getPublicCheckoutSessionSummary(sessionId: string) {
    return api<PaymentSessionSummaryDto>(`/api/v1/public/payments/checkout-session/${sessionId}`, {
        companyId: null,
    });
}

export function getPrivateCheckoutSessionSummary(sessionId: string) {
    return api<PaymentSessionSummaryDto>(`/api/v1/payments/checkout-session/${sessionId}`);
}
