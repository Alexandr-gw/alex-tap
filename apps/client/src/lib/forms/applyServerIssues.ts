// src/lib/forms/applyServerIssues.ts
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import type { ApiError, ZodIssue } from "@/lib/api/apiError";

function pathToName(path: Array<string | number>): string {
    // Zod gives ["client","email"] → "client.email"
    // RHF supports dot paths. Numbers are fine for arrays.
    return path.map(String).join(".");
}

export function applyServerIssues<TFields extends FieldValues>(
    setError: UseFormSetError<TFields>,
    issues: ZodIssue[] | undefined,
    fallbackMessage = "Please check the form.",
) {
    if (!issues?.length) {
        setError("root" as FieldPath<TFields>, { type: "server", message: fallbackMessage });
        return;
    }

    for (const iss of issues) {
        const name = pathToName(iss.path) as FieldPath<TFields>;
        setError(name, { type: "server", message: iss.message });
    }
}

export function applyApiErrorToForm<TFields extends FieldValues>(
    setError: UseFormSetError<TFields>,
    err: unknown,
    fallbackMessage = "Something went wrong.",
) {
    const e = err as ApiError | undefined;

    // Your Zod pipe: { ok:false, error:'validation_error', issues:[...] }
    if (e?.code === "validation_error") {
        applyServerIssues(setError, e.issues, fallbackMessage);
        return;
    }

    // Common auth + general errors
    const msg =
        (typeof e?.message === "string" && e.message) ||
        fallbackMessage;

    setError("root" as FieldPath<TFields>, { type: "server", message: msg });
}
