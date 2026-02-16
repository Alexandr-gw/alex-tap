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

    let body: any = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }

    // { ok:false, error:'validation_error', issues:[...] }
    if (body && !body.ok && typeof body.error === "string") {
        return {
            status,
            message: body.error,
            code: body.error,
            issues: Array.isArray(body.issues) ? body.issues : undefined,
            raw: body,
        };
    }

    const msg =
        (typeof body?.message === "string" && body.message) ||
        (Array.isArray(body?.message) && body.message.join(", ")) ||
        res.statusText ||
        "Request failed";

    return {
        status,
        message: msg,
        code: typeof body?.error === "string" ? body.error : undefined,
        raw: body ?? undefined,
    };
}
