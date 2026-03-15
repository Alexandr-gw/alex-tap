import { isAuthRefreshPath, refreshAccessSession } from "@/lib/session/refresh";

export const API_BASE = "/api";

export type ApiError = { status: number; message: string };

function getActiveCompanyId() {
    return localStorage.getItem("activeCompanyId");
}

function hasJsonBody(init: RequestInit) {
    if (!init.body) return false;
    if (typeof init.body === "string") return true;
    return false;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const companyId = getActiveCompanyId();

    const request = () => fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            ...(hasJsonBody(init) ? { "Content-Type": "application/json" } : {}),
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(init.headers ?? {}),
        },
    });

    let res = await request();

    if (res.status === 401 && !isAuthRefreshPath(path)) {
        try {
            await refreshAccessSession();
            res = await request();
        } catch {}
    }

    if (!res.ok) {
        let message = res.statusText;
        try {
            const json = await res.json();
            message = json?.error ?? json?.message ?? message;
        } catch {}
        throw { status: res.status, message } satisfies ApiError;
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}
