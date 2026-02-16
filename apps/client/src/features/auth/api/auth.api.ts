import { API_BASE, apiFetch } from "@/lib/api";

export function startLogin() {
    window.location.href = `${API_BASE}/auth/login`;
}

export async function logout() {
    await apiFetch<void>("/auth/logout", { method: "POST" });
    localStorage.removeItem("activeCompanyId");
}