export type MembershipRole = "ADMIN" | "MANAGER" | "WORKER" | "CLIENT";

export type MeResponse = {
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
    activeCompanyTimezone: string | null;
};
