// src/features/me/hooks/useMe.ts
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/features/me/api/me.api";
import { setActiveCompanyId, getActiveCompanyId } from "@/lib/session/company";

export type MembershipRole = "ADMIN" | "MANAGER" | "WORKER" | "CLIENT";

export type MeDto = {
    sub: string;
    email: string | null;
    username: string | null;
    email_verified: boolean;
    rolesFromToken: string[];
    memberships: Array<{
        companyId: string;
        companyName: string;
        role: MembershipRole;
    }>;
    activeCompanyId: string | null;
};

export function useMe(companyId?: string | null) {
    const normalized = companyId ?? null;

    const q = useQuery<MeDto>({
        queryKey: ["me", normalized],
        queryFn: () => getMe(normalized),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    useEffect(() => {
        const next = q.data?.activeCompanyId ?? null;
        if (!next) return;

        const current = getActiveCompanyId();
        if (current !== next) setActiveCompanyId(next);
    }, [q.data?.activeCompanyId]);

    return q;
}
