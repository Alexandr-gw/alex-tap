// src/feat/me/api/me.api.ts
import { api } from "@/lib/api/apiClient";
import { isApiError } from "@/lib/api/apiError";
import { getActiveCompanyId, setActiveCompanyId } from "@/lib/session/company";
import type { MeResponse } from "./me.types";

export function getMe(companyId?: string | null): Promise<MeResponse> {
    const resolvedCompanyId = companyId === undefined ? getActiveCompanyId() : companyId;

    return api<MeResponse>("/me", { companyId: resolvedCompanyId ?? null }).catch(error => {
        // A stale company selection from a previous user/session can make `/me` return 403
        // right after a successful OIDC callback. Clear it once and retry without a company.
        if (companyId === undefined && resolvedCompanyId && isApiError(error) && error.status === 403) {
            setActiveCompanyId(null);
            return api<MeResponse>("/me", { companyId: null });
        }

        throw error;
    });
}
