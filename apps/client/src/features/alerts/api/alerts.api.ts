import { api } from "@/lib/api/apiClient";
import type { AlertDetail, AlertsListResponse, ReviewJobInput, UnreadCountResponse } from "./alerts.types";

const ALERTS_BASE = "/api/v1/alerts";
const JOBS_BASE = "/api/v1/jobs";

function qs(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (!value) return;
        sp.set(key, value);
    });
    const out = sp.toString();
    return out ? `?${out}` : "";
}

export const alertsApi = {
    unreadCount() {
        return api<UnreadCountResponse>(`${ALERTS_BASE}/unread-count`);
    },

    list(status: "OPEN" | "RESOLVED" = "OPEN") {
        return api<AlertsListResponse>(`${ALERTS_BASE}${qs({ status })}`);
    },

    getOne(id: string) {
        return api<AlertDetail>(`${ALERTS_BASE}/${id}`);
    },

    markRead(id: string) {
        return api<{ ok: true }, undefined>(`${ALERTS_BASE}/${id}/read`, {
            method: "POST",
        });
    },

    reviewJob(jobId: string, payload: ReviewJobInput) {
        return api<AlertDetail["job"], ReviewJobInput>(`${JOBS_BASE}/${jobId}/review`, {
            method: "PATCH",
            body: payload,
        });
    },
};

