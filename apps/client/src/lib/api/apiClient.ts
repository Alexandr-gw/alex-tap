import { getActiveCompanyId } from "@/lib/session/company";
import { toApiError } from "./apiError";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions<TBody> = {
    method?: HttpMethod;
    body?: TBody;
    headers?: Record<string, string | undefined>;
    signal?: AbortSignal;
    credentials?: RequestCredentials; // default include
    companyId?: string | null;
};

const API_ORIGIN = import.meta.env.VITE_API_URL as string | undefined;

function cleanHeaders(h?: Record<string, string | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    if (!h) return out;
    for (const [k, v] of Object.entries(h)) {
        if (typeof v === "string") out[k] = v;
    }
    return out;
}

function buildUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/api")) return path; // proxy style
    if (API_ORIGIN) return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
    return path;
}

export async function api<TResp, TBody = unknown>(
    path: string,
    opts: ApiRequestOptions<TBody> = {},
): Promise<TResp> {
    const method = opts.method ?? "GET";

    const headers: Record<string, string> = {
        ...cleanHeaders(opts.headers),
    };

    const companyId = opts.companyId ?? getActiveCompanyId();
    if (companyId) headers["x-company-id"] = companyId;

    let body: BodyInit | undefined;
    if (opts.body !== undefined && opts.body !== null && method !== "GET") {
        // Don’t overwrite if caller provided content-type (e.g. multipart)
        headers["content-type"] = headers["content-type"] ?? "application/json";
        body = headers["content-type"] === "application/json" ? JSON.stringify(opts.body) : (opts.body as any);
    }

    const res = await fetch(buildUrl(path), {
        method,
        headers,
        body,
        signal: opts.signal,
        credentials: opts.credentials ?? "include",
    });

    if (!res.ok) throw await toApiError(res);

    if (res.status === 204) return undefined as TResp;
    return (await res.json()) as TResp;
}
