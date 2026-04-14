import { isAuthRefreshPath, refreshAccessSession } from "@/lib/session/refresh";

const API_ORIGIN = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = "/server";

export type ApiError = { status: number; message: string };

function getActiveCompanyId() {
    return localStorage.getItem("activeCompanyId");
}

function hasJsonBody(init: RequestInit) {
    if (!init.body) return false;
    if (typeof init.body === "string") return true;
    return false;
}

function buildUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (API_ORIGIN) return `${API_ORIGIN}${normalized}`;
    if (normalized.startsWith(API_BASE)) return normalized;
    return `${API_BASE}${normalized}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const companyId = getActiveCompanyId();

    const request = () => fetch(buildUrl(path), {
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
        } catch {
            // Ignore refresh failures here; the original 401 will surface below.
        }
    }

    if (!res.ok) {
        let message = res.statusText;
        try {
            const json = await res.json();
            message = json?.error ?? json?.message ?? message;
        } catch {
            // Fall back to the status text when the response body is not JSON.
        }
        throw { status: res.status, message } satisfies ApiError;
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}
