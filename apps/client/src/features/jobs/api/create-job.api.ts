import { api } from "@/lib/api/apiClient";
import type { CreateJobInput, CreateJobResponse } from "./create-job.types";

export function createJob(input: CreateJobInput): Promise<CreateJobResponse> {
    return api<CreateJobResponse, CreateJobInput>("/api/v1/jobs", {
        method: "POST",
        body: input,
    });
}
