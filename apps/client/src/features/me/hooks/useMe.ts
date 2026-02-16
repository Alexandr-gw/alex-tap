// src/features/me/hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/features/me/api/me.api";

// 🔹 Match backend enum EXACTLY (uppercase)
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
        role: MembershipRole; // from DB enum
    }>;

    activeCompanyId: string | null;
};

export function useMe(companyId?: string | null) {
    const normalized = companyId ?? null;

    return useQuery<MeDto>({
        queryKey: ["me", normalized],
        queryFn: () => getMe(normalized),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
