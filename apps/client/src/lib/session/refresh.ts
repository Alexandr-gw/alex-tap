let refreshPromise: Promise<void> | null = null;

const API_ORIGIN = import.meta.env.VITE_API_URL as string | undefined;
const API_PROXY_BASE = "/server";
const REFRESH_PATH = "/auth/refresh";

function buildRefreshUrl() {
    if (API_ORIGIN) {
        return `${API_ORIGIN.replace(/\/$/, "")}${REFRESH_PATH}`;
    }

    return `${API_PROXY_BASE}${REFRESH_PATH}`;
}

export function isAuthRefreshPath(path: string) {
    return path.includes(REFRESH_PATH);
}

export async function refreshAccessSession() {
    if (!refreshPromise) {
        refreshPromise = fetch(buildRefreshUrl(), {
            method: "POST",
            credentials: "include",
        }).then((response) => {
            if (!response.ok) {
                throw new Error("Session refresh failed");
            }
        }).finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}
