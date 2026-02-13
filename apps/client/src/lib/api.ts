export const API_BASE = "/api";

export type ApiError = { status: number; message: string };

function getActiveCompanyId() {
    return localStorage.getItem("activeCompanyId");
}

function hasJsonBody(init: RequestInit) {
    // only set Content-Type when we're actually sending JSON
    if (!init.body) return false;
    if (typeof init.body === "string") return true; // usually JSON.stringify(...)
    return false; // FormData/Blob/etc should NOT force application/json
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const companyId = getActiveCompanyId();

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: "include", // ✅ send HttpOnly cookies
        headers: {
            ...(hasJsonBody(init) ? { "Content-Type": "application/json" } : {}),
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(init.headers ?? {}),
        },
    });

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


