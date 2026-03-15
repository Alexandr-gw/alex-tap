import { useQuery } from "@tanstack/react-query";
import { getTasks } from "@/features/tasks/api/tasks.api";
import { getWorkers, getJobsForDay } from "../api/schedule.api";

export function useScheduleDay(date: string) {
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59`;

    const workersQuery = useQuery({
        queryKey: ["workers"],
        queryFn: getWorkers,
    });

    const jobsQuery = useQuery({
        queryKey: ["jobs", date],
        queryFn: () => getJobsForDay(from, to),
    });

    const tasksQuery = useQuery({
        queryKey: ["tasks", { from, to }],
        queryFn: () => getTasks({ from, to }),
    });

    return {
        workers: workersQuery.data ?? [],
        jobs: jobsQuery.data?.items ?? [],
        tasks: tasksQuery.data?.items ?? [],
        timezone: jobsQuery.data?.timezone ?? null,
        isLoading: workersQuery.isLoading || jobsQuery.isLoading || tasksQuery.isLoading,
    };
}
