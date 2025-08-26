import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private cfg: ConfigService) {}

    canActivate(ctx: ExecutionContext) {
        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (!required?.length) return true;

        const req = ctx.switchToHttp().getRequest<{ user?: any }>();
        const user = req.user;
        if (!user) throw new ForbiddenException('unauthenticated');

        const clientId = this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID');

        const realmRoles  = user?.realm_access?.roles ?? [];
        const clientRoles = user?.resource_access?.[clientId]?.roles ?? [];

        if (!Array.isArray(realmRoles) && !Array.isArray(clientRoles)) {
            throw new ForbiddenException('no_roles_found');
        }

        const all = new Set<string>([
            ...(Array.isArray(realmRoles)  ? realmRoles  : []),
            ...(Array.isArray(clientRoles) ? clientRoles : []),
        ]);

        const ok = required.some(r => all.has(r));
        if (!ok) throw new ForbiddenException('insufficient_roles');
        return true;
    }
}
