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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const config_1 = require("@nestjs/config");
let AuthController = class AuthController {
    AuthService;
    cfg;
    constructor(AuthService, cfg) {
        this.AuthService = AuthService;
        this.cfg = cfg;
    }
    login(req, res) {
        const { codeVerifier, codeChallenge } = this.AuthService.generatePkce();
        const state = crypto.randomUUID();
        const nonce = crypto.randomUUID();
        res.cookie('pkce_verifier', codeVerifier, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 5 * 60 * 1000
        });
        res.cookie('oidc_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });
        res.cookie('oidc_nonce', nonce, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000 });
        const authorizationUrl = this.AuthService.buildAuthUrl({
            authorizationEndpoint: this.cfg.getOrThrow('KEYCLOAK_AUTHORIZATION_ENDPOINT'),
            clientId: this.cfg.getOrThrow('KEYCLOAK_CLIENT_ID'),
            redirectUri: this.cfg.getOrThrow('OIDC_REDIRECT_URI'),
            challenge: codeChallenge,
            state,
            nonce,
        });
        return res.redirect(authorizationUrl);
    }
    async callback(req, res) {
        const code = req.query['code'] || '';
        const state = req.query['state'] || '';
        const storedState = req.cookies['oidc_state'];
        const codeVerifier = req.cookies['pkce_verifier'];
        const savedNonce = req.cookies['oidc_nonce'];
        if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
            return res.redirect(`${this.cfg.get('APP_BASE_URL')}/401`);
        }
        try {
            const tokenResponse = await this.AuthService.exchangeCodeForToken({
                tokenEndpoint: this.cfg.getOrThrow('OIDC_TOKEN_ENDPOINT'),
                clientId: this.cfg.getOrThrow('OIDC_CLIENT_ID'),
                code,
                codeVerifier,
                redirectUri: this.cfg.getOrThrow('OIDC_REDIRECT_URI'),
            });
            const { access_token, refresh_token, id_token } = tokenResponse || {};
            if (!access_token || !id_token) {
                throw new Error('Missing tokens in response');
            }
            const b64 = id_token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='), 'base64').toString('utf8'));
            if (!payload.nonce || payload.nonce !== savedNonce) {
                throw new Error('Nonce mismatch');
            }
            const cookieOpts = {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
            };
            const accessName = this.cfg.getOrThrow('COOKIE_NAME_ACCESS');
            const refreshName = this.cfg.getOrThrow('COOKIE_NAME_REFRESH');
            const accessTtl = Math.max(1, Math.floor((tokenResponse.expires_in ?? 300) * 0.95)) * 1000;
            const refreshTtl = Math.max(1, Math.floor((tokenResponse.refresh_expires_in ?? 3600) * 0.95)) * 1000;
            res.cookie(accessName, access_token, { ...cookieOpts, maxAge: accessTtl });
            if (refresh_token) {
                res.cookie(refreshName, refresh_token, { ...cookieOpts, maxAge: refreshTtl });
            }
            res.clearCookie('oidc_state');
            res.clearCookie('oidc_nonce');
            res.clearCookie('pkce_verifier');
            return res.redirect(this.cfg.getOrThrow('APP_BASE_URL'));
        }
        catch (err) {
            res.clearCookie('oidc_state');
            res.clearCookie('oidc_nonce');
            res.clearCookie('pkce_verifier');
            return res.redirect(`${this.cfg.getOrThrow('APP_BASE_URL')}/401`);
        }
    }
    async refresh(req, res) {
        const appBase = this.cfg.getOrThrow('APP_BASE_URL');
        const accessName = this.cfg.getOrThrow('COOKIE_NAME_ACCESS');
        const refreshName = this.cfg.getOrThrow('COOKIE_NAME_REFRESH');
        const refreshToken = req.cookies[refreshName];
        if (!refreshToken) {
            return res.status(401).json({ error: 'no_refresh' });
        }
        const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
        try {
            const json = await this.AuthService.refreshToken({
                tokenEndpoint: this.cfg.getOrThrow('KEYCLOAK_TOKEN_ENDPOINT'),
                clientId: this.cfg.getOrThrow('KEYCLOAK_CLIENT_ID'),
                refreshToken,
            });
            const { access_token, refresh_token, id_token, expires_in, refresh_expires_in } = json || {};
            if (!access_token || !id_token) {
                throw new Error('Missing tokens in response');
            }
            const accessTtlMs = Math.max(1, Math.floor((expires_in ?? 300) * 0.95)) * 1000;
            const refreshTtlMs = Math.max(1, Math.floor((refresh_expires_in ?? 3600) * 0.95)) * 1000;
            res.cookie(accessName, access_token, { ...cookieOpts, maxAge: accessTtlMs });
            if (refresh_token) {
                res.cookie(refreshName, refresh_token, { ...cookieOpts, maxAge: refreshTtlMs });
            }
            return res.json({ ok: true });
        }
        catch (err) {
            res.clearCookie(accessName, cookieOpts);
            res.clearCookie(refreshName, cookieOpts);
            return res.status(401).json({ error: 'refresh_failed' });
        }
    }
    async logout(req, res) {
        const accessName = this.cfg.getOrThrow('COOKIE_NAME_ACCESS');
        const refreshName = this.cfg.getOrThrow('COOKIE_NAME_REFRESH');
        const clientId = this.cfg.getOrThrow('KEYCLOAK_CLIENT_ID');
        const kcLogoutPOST = this.cfg.getOrThrow('KEYCLOAK_LOGOUT_ENDPOINT');
        const appBase = this.cfg.getOrThrow('APP_BASE_URL');
        const kcLogoutGET = this.cfg.get('OIDC_LOGOUT_ENDPOINT');
        const postLogout = this.cfg.get('OIDC_POST_LOGOUT_REDIRECT_URI') ?? `${appBase}/login`;
        const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
        const refreshToken = req.cookies?.[refreshName];
        try {
            await this.AuthService.frontChannelLogout({
                logoutEndpoint: kcLogoutPOST,
                clientId,
                refreshToken,
            });
        }
        catch {
        }
        res.clearCookie(accessName, cookieOpts);
        res.clearCookie(refreshName, cookieOpts);
        if (kcLogoutGET) {
            const url = new URL(kcLogoutGET);
            url.searchParams.set('post_logout_redirect_uri', postLogout);
            return res.redirect(url.toString());
        }
        return res.json({ ok: true });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService, config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map