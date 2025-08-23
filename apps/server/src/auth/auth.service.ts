import {Injectable} from '@nestjs/common';
import {randomBytes, createHash} from 'crypto';

function base64urlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
        .replace(/=/g, '') // Remove padding
        .replace(/\+/g, '-') // Replace '+' with '-'
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

    exchangeCodeForToken(params: {
        tokenEndpoint:string;
        clientId:string;
        code:string;
        codeVerifier:string;
        redirectUri:string;
    }){
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('client_id', params.clientId);
        body.set('code', params.code);
        body.set('code_verifier', params.codeVerifier);
        body.set('redirect_uri', params.redirectUri);

        return fetch(params.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        }).then(res => {
            if (!res.ok) {
                throw new Error(`Token exchange failed: ${res.statusText}`);
            }
            return res.json();
        });
    }

    refreshToken(params:{
        tokernEndpoint:string;
        clientId:string;
        refreshToken:string;
    }){
        const body = new URLSearchParams();
        body.set('grant_type', 'refresh_token');
        body.set('client_id', params.clientId);
        body.set('refresh_token', params.refreshToken);

        return fetch(params.tokernEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        }).then(res => {
            if (!res.ok) {
                throw new Error(`Token refresh failed: ${res.statusText}`);
            }
            return res.json();
        });
    }


}

