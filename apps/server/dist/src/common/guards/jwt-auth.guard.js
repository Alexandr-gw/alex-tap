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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
let JwtAuthGuard = class JwtAuthGuard {
    jwks;
    issuer;
    apiAudience;
    loginClientId;
    accessCookieName;
    constructor(cfg) {
        this.issuer = cfg.getOrThrow('KEYCLOAK_ISSUER');
        this.apiAudience = cfg.getOrThrow('API_AUDIENCE');
        this.loginClientId = cfg.getOrThrow('KEYCLOAK_CLIENT_ID');
        this.accessCookieName = cfg.get('COOKIE_NAME_ACCESS') || 'token';
        const jwksUri = cfg.getOrThrow('KEYCLOAK_JWKS_URI');
        this.jwks = (0, jose_1.createRemoteJWKSet)(new URL(jwksUri));
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const auth = req.header('authorization') || '';
        const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : undefined;
        const cookieToken = req.cookies?.[this.accessCookieName];
        const token = bearer ?? cookieToken;
        if (!token)
            throw new common_1.UnauthorizedException('missing_token');
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, this.jwks, {
                issuer: this.issuer,
                audience: this.apiAudience,
                clockTolerance: 5,
            });
            const claims = payload;
            if (claims.typ && claims.typ !== 'Bearer') {
                throw new common_1.UnauthorizedException('invalid_typ');
            }
            const realmRoles = claims.realm_access?.roles ?? [];
            const apiClientRoles = claims.resource_access?.[this.apiAudience]?.roles ?? [];
            const allClientRoles = Object.values(claims.resource_access ?? {})
                .flatMap(r => r.roles ?? []);
            const merged = (apiClientRoles.length ? apiClientRoles : allClientRoles)
                .concat(realmRoles)
                .map(r => r.toLowerCase());
            const roles = Array.from(new Set(merged));
            const companyId = claims.companyId ??
                req.header('x-company-id') ??
                req.cookies?.['active_company_id'] ??
                null;
            req.user = {
                sub: claims.sub,
                email: claims.email ?? null,
                username: claims.preferred_username ?? null,
                roles,
                companyId,
                raw: undefined,
            };
            return true;
        }
        catch (e) {
            if (e instanceof jose_1.errors.JWTExpired) {
                throw new common_1.UnauthorizedException('token_expired');
            }
            if (e instanceof jose_1.errors.JWTClaimValidationFailed) {
                throw new common_1.UnauthorizedException(`claim_${e.claim}_invalid`);
            }
            throw new common_1.UnauthorizedException(e?.message || 'invalid_token');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map