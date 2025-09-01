import { ConfigService } from '@nestjs/config';
export declare class MeController {
    private cfg;
    constructor(cfg: ConfigService);
    me(claims: any, companyId: string | null): Promise<{
        sub: any;
        email: any;
        username: any;
        email_verified: any;
        roles: any[];
        activeCompanyId: string | null;
        memberships: {
            companyId: string;
            role: string;
            companyName?: string;
        }[];
    }>;
}
