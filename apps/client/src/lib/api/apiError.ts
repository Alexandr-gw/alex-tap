// src/lib/api/apiError.ts
export type ZodIssue = {
    path: Array<string | number>;
    message: string;
    code?: string;
};

export type ApiError = {
    status: number;
    message: string;
    code?: string; // "validation_error" | "missing_token" | ...
    issues?: ZodIssue[];
    raw?: unknown;
};

export function isApiError(e: unknown): e is ApiError {
    return typeof e === "object" && e !== null && "status" in e && "message" in e;
}

export async function toApiError(res: Response): Promise<ApiError> {
    const status = res.status;

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }

    const bodyRecord = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;

    // { ok:false, error:'validation_error', issues:[...] }
    if (bodyRecord && bodyRecord.ok === false && typeof bodyRecord.error === "string") {
        return {
            status,
            message: bodyRecord.error,
            code: bodyRecord.error,
            issues: Array.isArray(bodyRecord.issues) ? (bodyRecord.issues as ZodIssue[]) : undefined,
            raw: body,
        };
    }

    const msg =
        (bodyRecord && typeof bodyRecord.message === "string" && bodyRecord.message) ||
        (bodyRecord && Array.isArray(bodyRecord.message) && bodyRecord.message.join(", ")) ||
        res.statusText ||
        "Request failed";

    return {
        status,
        message: msg,
        code: bodyRecord && typeof bodyRecord.error === "string" ? bodyRecord.error : undefined,
        raw: body ?? undefined,
    };
}
