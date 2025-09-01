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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const auth_user_decorator_1 = require("../common/decorators/auth-user.decorator");
const config_1 = require("@nestjs/config");
let MeController = class MeController {
    cfg;
    constructor(cfg) {
        this.cfg = cfg;
    }
    async me(claims, companyId) {
        const clientId = this.cfg.get('KEYCLOAK_CLIENT_ID');
        const roles = [
            ...(claims?.realm_access?.roles ?? []),
            ...(claims?.resource_access?.[clientId]?.roles ?? []),
        ];
        const memberships = [];
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
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_user_decorator_1.AuthUser)()),
    __param(1, (0, auth_user_decorator_1.CompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "me", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MeController);
//# sourceMappingURL=me.controller.js.map