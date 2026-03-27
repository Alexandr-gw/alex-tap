import { useCreateCheckout } from "../hooks/booking.queries";
import type { PublicServiceListItemDto } from "../api/booking.types";
import { setLastActiveBookingDraftKey } from "../draft.utils";

function buildClientAddress(client: {
    addressLine1?: string;
    addressLine2?: string;
}) {
    return [client.addressLine1?.trim(), client.addressLine2?.trim()]
        .filter(Boolean)
        .join(", ");
}

export function StepConfirm({
                                wizard,
                                companyId,
                                companySlug,
                                serviceId,
                                selectedService,
                            }: {
    wizard: any;
    companyId: string;
    companySlug: string;
    serviceId: string;
    selectedService: PublicServiceListItemDto;
}) {
    const checkoutM = useCreateCheckout();

    const slot = wizard.draft.slot;
    const client = wizard.draft.client;
    const clientAddress = buildClientAddress(client);

    async function onPayAndBook() {
        if (!slot) return;

        const origin = window.location.origin;

        const res = await checkoutM.mutateAsync({
            companyId,
            serviceId,
            start: slot.start,
            successUrl: `${origin}/payment/success?companySlug=${encodeURIComponent(companySlug)}&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${origin}/payment/cancel?companySlug=${encodeURIComponent(companySlug)}&session_id={CHECKOUT_SESSION_ID}`,
            client: {
                name: client.name,
                email: client.email || undefined,
                phone: client.phone || undefined,
                address: clientAddress || undefined,
                notes: client.notes || undefined,
            },
        });

        setLastActiveBookingDraftKey(wizard.key);
        window.location.href = res.checkoutUrl;
    }

    return (
        <div>
            <div className="space-y-2">
                <div className="text-sm text-slate-600">Review</div>

                <div className="text-slate-900 font-medium">
                    {selectedService.name}
                </div>

                <div className="text-sm text-slate-700">
                    Slot: {slot ? new Date(slot.start).toLocaleString() : "-"}
                </div>

                <div className="text-sm text-slate-700">Client: {client.name}</div>
                {clientAddress ? (
                    <div className="text-sm text-slate-700">Address: {clientAddress}</div>
                ) : null}
            </div>

            {checkoutM.isError ? (
                <div className="mt-3 text-sm text-red-600">Checkout failed. Please try again.</div>
            ) : null}

            <div className="mt-6 flex justify-between">
                <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={wizard.back}>
                    Back
                </button>

                <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={checkoutM.isPending || !slot}
                    onClick={onPayAndBook}
                >
                    {checkoutM.isPending ? "Redirecting..." : "Pay & Book"}
                </button>
            </div>
        </div>
    );
}
