import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CompanyId } from '../common/decorators/auth-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
    constructor(private cfg: ConfigService) {}

    @Get()
    async me(@AuthUser() claims: any, @CompanyId() companyId: string | null) {
        const clientId = this.cfg.get<string>('KEYCLOAK_CLIENT_ID')!;
        const roles = [
            ...(claims?.realm_access?.roles ?? []),
            ...(claims?.resource_access?.[clientId]?.roles ?? []),
        ];


        const memberships: Array<{ companyId: string; role: string; companyName?: string }> = [];

        return {
            sub: claims.sub,
            email: claims.email ?? null,
            username: claims.preferred_username ?? null,
            email_verified: claims.email_verified ?? false,
            roles,
            activeCompanyId: companyId,
            memberships,
        };
    }
}
