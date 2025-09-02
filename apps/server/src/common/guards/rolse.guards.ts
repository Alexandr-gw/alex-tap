import {
    CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException
} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {ConfigService} from '@nestjs/config';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly cfg: ConfigService) {
    }

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (!required?.length) return true;

        const req = ctx.switchToHttp().getRequest<{ user?: any }>();
        const user = req.user;
        if (!user) throw new UnauthorizedException('unauthenticated');

        const clientId = this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID'); // login client id

        const realmRoles = Array.isArray(user?.realm_access?.roles) ? user.realm_access.roles : [];
        const clientRoles = Array.isArray(user?.resource_access?.[clientId]?.roles)
            ? user.resource_access[clientId].roles
            : [];

        const norm = (r: string) => r.toLowerCase();
        const all = new Set([...realmRoles, ...clientRoles].map(norm));
        const ok = required.some(r => all.has(norm(r)));

        if (!ok) throw new ForbiddenException('insufficient_roles');
        return true;
    }
}
