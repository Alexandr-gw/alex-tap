"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
let JwtAuthGuard = class JwtAuthGuard {
    jwks = (0, jose_1.createRemoteJWKSet)(new URL(process.env.KEYCLOAK_JWKS_URI));
    issuer = process.env.KEYCLOAK_ISSUER;
    audience = process.env.API_AUDIENCE;
    accessCookie = process.env.COOKIE_NAME_ACCESS || 'token';
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const bearer = req.header('authorization')?.toLowerCase().startsWith('bearer ')
            ? req.header('authorization').slice(7)
            : undefined;
        const cookieToken = req.cookies?.[this.accessCookie];
        const token = bearer ?? cookieToken;
        if (!token)
            throw new common_1.UnauthorizedException('missing_token');
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, this.jwks, {
                issuer: this.issuer,
                audience: this.audience,
            });
            req.user = payload;
            req.companyId = req.header('x-company-id') ?? req.cookies?.['active_company_id'] ?? null;
            return true;
        }
        catch (e) {
            throw new common_1.UnauthorizedException(e?.message || 'invalid_token');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map