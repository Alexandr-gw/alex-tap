import { api } from "@/lib/api/apiClient";
import type { JobsForDayResponse, WorkerDto } from "./schedule.types";

export function getWorkers(): Promise<WorkerDto[]> {
    return api("/api/api/v1/workers");
}

export function getJobsForDay(from: string, to: string): Promise<JobsForDayResponse> {
    const params = new URLSearchParams({ from, to });
    return api(`/api/api/v1/jobs?${params.toString()}`);
}

