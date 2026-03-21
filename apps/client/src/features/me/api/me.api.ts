// src/feat/me/api/me.api.ts
import { api } from "@/lib/api/apiClient";
import type { MeResponse } from "./me.types";

export function getMe(companyId?: string | null): Promise<MeResponse> {
    return api<MeResponse>("/me", { companyId: companyId ?? undefined });
}
