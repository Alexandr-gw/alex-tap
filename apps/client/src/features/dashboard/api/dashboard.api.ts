import { api } from "@/lib/api/apiClient";
import type { DashboardBriefingDto } from "./dashboard.types";

export function getDashboardBriefing() {
    return api<DashboardBriefingDto>("/api/v1/dashboard/briefing");
}
