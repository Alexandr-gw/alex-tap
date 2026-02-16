// src/feat/me/hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/features/me/api/me.api.ts";

export function useMe() {
    return useQuery({
        queryKey: ["me"],
        queryFn: () => getMe(),
        staleTime: 30_000,
        retry: (count, err: any) => {
            const status = typeof err?.status === "number" ? err.status : 0;
            if (status === 401 || status === 403) return false;
            return count < 1;
        },
    });
}
