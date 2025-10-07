import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwks;
    private readonly issuer;
    private readonly apiAudience;
    private readonly loginClientId;
    private readonly accessCookieName;
    constructor(cfg: ConfigService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
