let refreshPromise: Promise<void> | null = null;

export function isAuthRefreshPath(path: string) {
    return path.includes("/auth/refresh");
}

export async function refreshAccessSession() {
    if (!refreshPromise) {
        refreshPromise = fetch("/api/auth/refresh", {
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
