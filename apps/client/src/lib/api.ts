export const API_BASE = "/api";

export type ApiError = { status: number; message: string };

function getActiveCompanyId() {
    return localStorage.getItem("activeCompanyId");
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const companyId = getActiveCompanyId();

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}), // optional improvement
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(init.headers ?? {}),
        },
    });

    if (!res.ok) {
        let msg = res.statusText;
        try {
            const json = await res.json();
            msg = json?.error ?? json?.message ?? msg;
        } catch {}
        throw { status: res.status, message: msg } satisfies ApiError;
    }

    // if some endpoints return 204
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
}
