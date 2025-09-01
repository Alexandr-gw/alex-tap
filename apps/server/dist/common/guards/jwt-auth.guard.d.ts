import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class JwtAuthGuard implements CanActivate {
    private jwks;
    private issuer;
    private audience;
    private accessCookie;
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
