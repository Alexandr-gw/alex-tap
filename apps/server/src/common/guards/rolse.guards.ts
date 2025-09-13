import {
    CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException
} from '@nestjs/common';
import {Reflector} from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>('roles', [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (!required?.length) return true;

        const req = ctx.switchToHttp().getRequest<{ user?: any }>();
        const user = req.user;
        if (!user) throw new UnauthorizedException('unauthenticated');

        const precomputed = Array.isArray(user.roles) ? user.roles : [];

        const realm = Array.isArray(user?.realm_access?.roles) ? user.realm_access.roles : [];
        const allClient = Object.values(user?.resource_access ?? {}).flatMap(
            (r: any) => Array.isArray(r?.roles) ? r.roles : []
        );

        const toSet = (arr: string[]) => new Set(arr.map(r => r.toLowerCase()));
        const all = toSet([...precomputed, ...realm, ...allClient]);

        const ok = required.some(r => all.has(r.toLowerCase()));
        if (!ok) throw new ForbiddenException('insufficient_roles');
        return true;
    }
}

