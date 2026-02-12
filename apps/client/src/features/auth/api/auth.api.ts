import { API_BASE, apiFetch } from "@/lib/api";

export function startLogin() {
    window.location.href = `${API_BASE}/auth/login`;
}

export async function logout() {
    // if your BE returns 204 or JSON, both are fine with apiFetch
    await apiFetch<void>("/auth/logout", { method: "POST" });
    localStorage.removeItem("activeCompanyId");
}

export async function getMe() {
    return apiFetch("/auth/me"); // only if backend has GET /auth/me
}
