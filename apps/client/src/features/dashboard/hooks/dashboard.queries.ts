import { useQuery } from "@tanstack/react-query";
import { getDashboardBriefing } from "@/features/dashboard/api/dashboard.api";
import type { DashboardBriefingDto } from "@/features/dashboard/api/dashboard.types";

export function useDashboardBriefing(enabled = true) {
    return useQuery<DashboardBriefingDto>({
        queryKey: ["dashboard", "briefing"],
        queryFn: () => getDashboardBriefing(),
        enabled,
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
