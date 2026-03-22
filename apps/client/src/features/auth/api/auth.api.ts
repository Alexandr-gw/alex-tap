import { apiFetch } from "@/lib/api";
import { setActiveCompanyId } from "@/lib/session/company";

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
    // Start every auth flow from a clean company selection so a previous session
    // cannot trap a newly signed-in user in a redirect loop.
    setActiveCompanyId(null);
    localStorage.removeItem("activeCompanyId");
    const { url } = await apiFetch<LoginUrlResponse>(`/auth/login-url${buildLoginSearch(returnTo)}`);
    window.location.assign(url);
}

export async function logout() {
    await apiFetch<void>("/auth/logout", { method: "POST" });
    setActiveCompanyId(null);
    localStorage.removeItem("activeCompanyId");
}
