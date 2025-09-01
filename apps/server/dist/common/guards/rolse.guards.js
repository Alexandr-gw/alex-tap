"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
let RolesGuard = class RolesGuard {
    reflector;
    cfg;
    constructor(reflector, cfg) {
        this.reflector = reflector;
        this.cfg = cfg;
    }
    canActivate(ctx) {
        const required = this.reflector.getAllAndOverride(exports.ROLES_KEY, [
            ctx.getHandler(), ctx.getClass(),
        ]);
        if (!required?.length)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const user = req.user;
        if (!user)
            throw new common_1.ForbiddenException('unauthenticated');
        const clientId = this.cfg.getOrThrow('KEYCLOAK_CLIENT_ID');
        const realmRoles = user?.realm_access?.roles ?? [];
        const clientRoles = user?.resource_access?.[clientId]?.roles ?? [];
        if (!Array.isArray(realmRoles) && !Array.isArray(clientRoles)) {
            throw new common_1.ForbiddenException('no_roles_found');
        }
        const all = new Set([
            ...(Array.isArray(realmRoles) ? realmRoles : []),
            ...(Array.isArray(clientRoles) ? clientRoles : []),
        ]);
        const ok = required.some(r => all.has(r));
        if (!ok)
            throw new common_1.ForbiddenException('insufficient_roles');
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector, config_1.ConfigService])
], RolesGuard);
//# sourceMappingURL=rolse.guards.js.map