import { useQuery } from "@tanstack/react-query";
import { listJobClients } from "../api/job-clients.api";

export function useJobClients(search: string, enabled: boolean) {
    return useQuery({
        queryKey: ["job-clients", search.trim()],
        queryFn: () => listJobClients(search),
        enabled,
        staleTime: 30_000,
    });
}
