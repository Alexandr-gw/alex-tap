import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
type Claims = {
    sub: string;
    email?: string;
    preferred_username?: string;
    email_verified?: boolean;
    realm_access?: {
        roles?: string[];
    };
    resource_access?: Record<string, {
        roles?: string[];
    }>;
};
export declare class MeController {
    private readonly prisma;
    private readonly cfg;
    constructor(prisma: PrismaService, cfg: ConfigService);
    me(claims: Claims, companyId: string | null): Promise<{
        sub: string;
        email: string | null;
        username: string | null;
        email_verified: boolean;
        rolesFromToken: string[];
        memberships: {
            companyId: string;
            companyName: string;
            role: import("@prisma/client").$Enums.Role;
        }[];
        activeCompanyId: string | null;
    }>;
}
export {};
