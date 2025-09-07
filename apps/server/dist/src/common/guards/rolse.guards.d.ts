import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class RolesGuard implements CanActivate {
    private readonly reflector;
    private readonly cfg;
    constructor(reflector: Reflector, cfg: ConfigService);
    canActivate(ctx: ExecutionContext): boolean;
}
