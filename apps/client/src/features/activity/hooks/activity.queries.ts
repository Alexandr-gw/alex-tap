import { useQuery } from "@tanstack/react-query";
import { getJobActivity } from "../api/activity.api";
import type { JobActivityResponse } from "../api/activity.types";

export const activityQueryKeys = {
    all: ["activity"] as const,
    job: (jobId: string) => [...activityQueryKeys.all, "job", jobId] as const,
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