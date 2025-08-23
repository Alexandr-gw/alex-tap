import {Controller, Req, Res, Get, Post} from '@nestjs/common';
import {AuthService} from './auth.service';
import {ConfigService} from "@nestjs/config";

@Controller('auth')
export class AuthController {
    constructor(private readonly AuthService: AuthService, private cfg: ConfigService) {
    }

    @Get('login')
    login(@Req() req, @Res() res) {
        const {codeVerifier, codeChallenge} = this.AuthService.generatePkce();
        const state = crypto.randomUUID();
        const nonce = crypto.randomUUID();

        res.cookie('pkce_verifier', codeVerifier, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 5 * 60 * 1000
        });
        res.cookie('oidc_state', state, {httpOnly: true, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000});
        res.cookie('oidc_nonce', nonce, {httpOnly: true, secure: true, sameSite: 'lax', maxAge: 5 * 60 * 1000});

        const authorizationUrl = this.AuthService.buildAuthUrl({
            authorizationEndpoint: this.cfg.getOrThrow<string>('OIDC_AUTHORIZATION_ENDPOINT'),
            clientId: this.cfg.getOrThrow<string>('OIDC_CLIENT_ID'),
            redirectUri: this.cfg.getOrThrow<string>('OIDC_REDIRECT_URI'),
            challenge: codeChallenge,
            state,
            nonce,
        });
        return res.redirect(authorizationUrl);
    }

    @Get('callback')
    async callback(@Req() req, @Res() res) {
        const code = (req.query['code'] as string) || '';
        const state = (req.query['state'] as string) || '';
        const storedState = req.cookies['oidc_state'];
        const codeVerifier = req.cookies['pkce_verifier'];
        const savedNonce = req.cookies['oidc_nonce'];

        if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
            return res.redirect(`${this.cfg.get<string>('APP_BASE_URL')}/401`); // Redirect to a 401 page on the frontend
        }

        try {
            const tokenResponse = await this.AuthService.exchangeCodeForToken({
                tokenEndpoint: this.cfg.getOrThrow<string>('OIDC_TOKEN_ENDPOINT'),
                clientId: this.cfg.getOrThrow<string>('OIDC_CLIENT_ID'),
                code,
                codeVerifier,
                redirectUri: this.cfg.getOrThrow<string>('OIDC_REDIRECT_URI'),
            });
            const {access_token, refresh_token, id_token} = tokenResponse || {};
            if (!access_token || !id_token) {
                throw new Error('Missing tokens in response');
            }
            // base64url decode payload to verify nonce
            const b64 = id_token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(b64!.padEnd(Math.ceil(b64!.length / 4) * 4, '='),
                'base64').toString('utf8'));
            if (!payload.nonce || payload.nonce !== savedNonce) {
                throw new Error('Nonce mismatch');
            }
            const cookieOpts = {
                httpOnly: true,
                secure: true,
                sameSite: 'lax' as const,
                path: '/',
            };
            const accessName = this.cfg.getOrThrow<string>('COOKIE_NAME_ACCESS');
            const refreshName = this.cfg.getOrThrow<string>('COOKIE_NAME_REFRESH');
            const accessTtl = Math.max(1, Math.floor((tokenResponse.expires_in ?? 300) * 0.95)) * 1000;
            const refreshTtl = Math.max(1, Math.floor((tokenResponse.refresh_expires_in ?? 3600) * 0.95)) * 1000;

            res.cookie(accessName, access_token, { ...cookieOpts, maxAge: accessTtl });
            if (refresh_token) {
                res.cookie(refreshName, refresh_token, { ...cookieOpts, maxAge: refreshTtl });
            }


            res.clearCookie('oidc_state');
            res.clearCookie('oidc_nonce');
            res.clearCookie('pkce_verifier');

            return res.redirect(this.cfg.getOrThrow<string>('APP_BASE_URL'));
        } catch (err) {
            res.clearCookie('oidc_state');
            res.clearCookie('oidc_nonce');
            res.clearCookie('pkce_verifier');
            return res.redirect(`${this.cfg.getOrThrow<string>('APP_BASE_URL')}/401`);
        }
    }

@Post('refresh')

@Post('logout')
}
