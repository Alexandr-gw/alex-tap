import { useQuery } from "@tanstack/react-query";
import { getJobNotifications } from "../api/notifications.api";
import type { JobNotificationsSummary } from "../api/notifications.types";

export const notificationQueryKeys = {
    all: ["notifications"] as const,
    job: (jobId: string) => [...notificationQueryKeys.all, "job", jobId] as const,
};

export function useJobNotifications(jobId?: string) {
    return useQuery<JobNotificationsSummary>({
        queryKey: jobId
            ? notificationQueryKeys.job(jobId)
            : [...notificationQueryKeys.all, "job", "unknown"],
        queryFn: () => {
            if (!jobId) {
                throw new Error("jobId is required");
            }
            return getJobNotifications(jobId);
        },
        enabled: Boolean(jobId),
        staleTime: 60_000,
    });
}
