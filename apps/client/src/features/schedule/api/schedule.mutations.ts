import { api } from "@/lib/api/apiClient";

export type UpdateScheduleJobInput = {
    jobId: string;
    startAt: string;
    endAt?: string;
};

export async function updateScheduleJobTime(input: UpdateScheduleJobInput) {
    return api(`/api/api/v1/jobs/${input.jobId}/review`, {
        method: "PATCH",
        body: {
            start: input.startAt,
            end: input.endAt,
        },
    });
}
