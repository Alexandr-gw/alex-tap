import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendJobConfirmationEmail } from "../api/notifications.api";
import { notificationQueryKeys } from "./notifications.queries";

type UseSendJobConfirmationEmailOptions = {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
};

export function useSendJobConfirmationEmail(
    jobId: string,
    options?: UseSendJobConfirmationEmailOptions
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => sendJobConfirmationEmail(jobId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: notificationQueryKeys.job(jobId),
            });
            await queryClient.invalidateQueries({
                queryKey: ['clients'],
            });

            options?.onSuccess?.();
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
}

