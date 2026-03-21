import { useMemo } from "react";
import { useSendJobConfirmationEmail } from "../hooks/notifications.mutations";
import type { ConfirmationSummary } from "../api/notifications.types";

type Props = {
    jobId: string;
    disabled?: boolean;
    confirmation: ConfirmationSummary;
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
};

export function SendConfirmationButton({
                                           jobId,
                                           disabled = false,
                                           confirmation,
                                           onSuccess,
                                           onError,
                                       }: Props) {
    const mutation = useSendJobConfirmationEmail(jobId, {
        onSuccess,
        onError,
    });

    const buttonLabel = useMemo(() => {
        return confirmation.status === "SENT"
            ? "Resend confirmation"
            : "Send confirmation";
    }, [confirmation.status]);

    return (
        <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disabled || mutation.isPending}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {mutation.isPending ? "Sending..." : buttonLabel}
        </button>
    );
}