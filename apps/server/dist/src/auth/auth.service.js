"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
function base64urlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
let AuthService = class AuthService {
    generatePkce() {
        const codeVerifier = base64urlEncode((0, crypto_1.randomBytes)(32));
        const codeChallenge = base64urlEncode((0, crypto_1.createHash)('sha256').update(codeVerifier).digest());
        return { codeVerifier, codeChallenge };
    }
    buildAuthUrl(params) {
        const url = new URL(params.authorizationEndpoint);
        url.searchParams.set('client_id', params.clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', 'openid email profile');
        url.searchParams.set('redirect_uri', params.redirectUri);
        url.searchParams.set('code_challenge', params.challenge);
        url.searchParams.set('code_challenge_method', 'S256');
        url.searchParams.set('state', params.state);
        url.searchParams.set('nonce', params.nonce);
        return url.toString();
    }
    async exchangeCodeForToken(params) {
        try {
            const body = new URLSearchParams();
            body.set('grant_type', 'authorization_code');
            body.set('client_id', params.clientId);
            body.set('code', params.code);
            body.set('code_verifier', params.codeVerifier);
            body.set('redirect_uri', params.redirectUri);
            const res = await fetch(params.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });
            const raw = await res.text();
            if (!res.ok) {
                throw new Error(`Token exchange failed: ${res.status} ${res.statusText} :: ${raw}`);
            }
            return JSON.parse(raw);
        }
        catch (error) {
            throw new Error(`Token exchange failed: ${error.message}`);
        }
    }
    async refreshToken(params) {
        try {
            const body = new URLSearchParams();
            body.set('grant_type', 'refresh_token');
            body.set('client_id', params.clientId);
            body.set('refresh_token', params.refreshToken);
            const res = await fetch(params.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });
            if (!res.ok) {
                throw new Error(`Token refresh failed: ${res.statusText}`);
            }
            return await res.json();
        }
        catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }
    async frontChannelLogout(params) {
        try {
            const body = new URLSearchParams();
            body.set('client_id', params.clientId);
            if (params.refreshToken) {
                body.set('refresh_token', params.refreshToken);
            }
            const res = await fetch(params.logoutEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString()
            });
            if (!res.ok) {
                throw new Error(`Front-channel logout failed: ${res.statusText}`);
            }
            return await res.text();
        }
        catch (error) {
            throw new Error(`Front-channel logout failed: ${error.message}`);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map