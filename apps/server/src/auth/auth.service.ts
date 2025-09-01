import {Injectable} from '@nestjs/common';
import {randomBytes, createHash} from 'crypto';

function base64urlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

@Injectable()
export class AuthService {
    generatePkce() {
        const codeVerifier = base64urlEncode(randomBytes(32));
        const codeChallenge = base64urlEncode(
            createHash('sha256').update(codeVerifier).digest()
        );
        return {codeVerifier, codeChallenge};
    }

    buildAuthUrl(params: {
        authorizationEndpoint: string;
        clientId: string;
        redirectUri: string;
        challenge: string;
        state: string;
        nonce: string;
    }) {
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

    async exchangeCodeForToken(params: {
        tokenEndpoint: string;
        clientId: string;
        code: string;
        codeVerifier: string;
        redirectUri: string;
    }) {
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
        } catch (error) {
            throw new Error(`Token exchange failed: ${error.message}`);
        }
    }

    async refreshToken(params: {
        tokenEndpoint: string;
        clientId: string;
        refreshToken: string;
    }) {
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
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    async frontChannelLogout(params: {
        logoutEndpoint: string;
        clientId: string;
        refreshToken?: string;
    }) {
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
        } catch (error) {
            throw new Error(`Front-channel logout failed: ${error.message}`);
        }
    }
}