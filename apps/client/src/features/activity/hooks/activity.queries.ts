import { useQuery } from "@tanstack/react-query";
import { getJobActivity, getRecentActivity } from "../api/activity.api";
import type { JobActivityResponse, RecentActivityResponse } from "../api/activity.types";

export const activityQueryKeys = {
    all: ["activity"] as const,
    job: (jobId: string) => [...activityQueryKeys.all, "job", jobId] as const,
    recent: (hours: number) => [...activityQueryKeys.all, "recent", hours] as const,
};

export function useJobActivity(jobId?: string) {
    return useQuery<JobActivityResponse>({
        queryKey: jobId
            ? activityQueryKeys.job(jobId)
            : [...activityQueryKeys.all, "job", "unknown"],
        queryFn: () => {
            if (!jobId) {
                throw new Error("jobId is required");
            }

            return getJobActivity(jobId);
        },
        enabled: Boolean(jobId),
    });
}

export function useRecentActivity(hours = 24, enabled = true) {
    return useQuery<RecentActivityResponse>({
        queryKey: activityQueryKeys.recent(hours),
        queryFn: () => getRecentActivity(hours),
        enabled,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });
}
