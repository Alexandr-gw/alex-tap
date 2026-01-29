const API_BASE = "/api";

export type ApiError = { status: number; message: string };

function getActiveCompanyId() {
    return localStorage.getItem("activeCompanyId");
}

export async function apiFetch<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const companyId = getActiveCompanyId();

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
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

    return res.json() as Promise<T>;
}

export function startLogin() {
    window.location.href = `${API_BASE}/auth/login`;
}

export async function logout() {
    // your BE endpoint is POST /auth/logout (it may redirect)
    const res = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });

    // In dev it might redirect; either way clean FE state
    localStorage.removeItem("activeCompanyId");
    if (res.redirected) window.location.href = res.url;
}
