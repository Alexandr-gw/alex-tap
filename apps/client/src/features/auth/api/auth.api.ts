import { apiFetch } from "@/lib/api";

type LoginUrlResponse = {
    url: string;
};

function buildLoginSearch(returnTo?: string) {
    const sp = new URLSearchParams();

    if (returnTo) {
        sp.set("returnTo", returnTo);
    }

    const search = sp.toString();
    return search ? `?${search}` : "";
}

export async function startLogin(returnTo?: string) {
    const { url } = await apiFetch<LoginUrlResponse>(`/auth/login-url${buildLoginSearch(returnTo)}`);
    window.location.assign(url);
}

export async function logout() {
    await apiFetch<void>("/auth/logout", { method: "POST" });
    localStorage.removeItem("activeCompanyId");
}
