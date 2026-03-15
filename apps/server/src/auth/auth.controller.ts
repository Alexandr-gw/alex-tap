import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly AuthService: AuthService, private cfg: ConfigService) {}

    private getCookieOptions() {
        const appBase = this.cfg.get<string>('APP_BASE_URL') ?? '';
        const secure = appBase.startsWith('https://');

        return {
            httpOnly: true,
            secure,
            sameSite: 'lax' as const,
            path: '/',
        };
    }

    @Get('login')
    login(@Req() req, @Res() res) {
        const { codeVerifier, codeChallenge } = this.AuthService.generatePkce();
        const state = crypto.randomUUID();
        const nonce = crypto.randomUUID();
        const cookieOpts = this.getCookieOptions();

        res.cookie('pkce_verifier', codeVerifier, {
            ...cookieOpts,
            maxAge: 5 * 60 * 1000,
        });
        res.cookie('oidc_state', state, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
        res.cookie('oidc_nonce', nonce, { ...cookieOpts, maxAge: 5 * 60 * 1000 });

        const authorizationUrl = this.AuthService.buildAuthUrl({
            authorizationEndpoint: this.cfg.getOrThrow<string>('KEYCLOAK_AUTHORIZATION_ENDPOINT'),
            clientId: this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID'),
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
            return res.redirect(`${this.cfg.get<string>('APP_BASE_URL')}/401`);
        }

        try {
            const tokenResponse = await this.AuthService.exchangeCodeForToken({
                tokenEndpoint: this.cfg.getOrThrow<string>('KEYCLOAK_TOKEN_ENDPOINT'),
                clientId: this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID'),
                code,
                codeVerifier,
                redirectUri: this.cfg.getOrThrow<string>('OIDC_REDIRECT_URI'),
            });
            const { access_token, refresh_token, id_token } = tokenResponse || {};
            if (!access_token || !id_token) {
                throw new Error('Missing tokens in response');
            }

            const b64 = id_token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(
                Buffer.from(
                    b64!.padEnd(Math.ceil(b64!.length / 4) * 4, '='),
                    'base64',
                ).toString('utf8'),
            );
            if (!payload.nonce || payload.nonce !== savedNonce) {
                throw new Error('Nonce mismatch');
            }

            const cookieOpts = this.getCookieOptions();
            const accessName = this.cfg.getOrThrow<string>('COOKIE_NAME_ACCESS');
            const refreshName = this.cfg.getOrThrow<string>('COOKIE_NAME_REFRESH');
            const accessTtl = Math.max(1, Math.floor((tokenResponse.expires_in ?? 300) * 0.95)) * 1000;
            const refreshTtl = Math.max(1, Math.floor((tokenResponse.refresh_expires_in ?? 3600) * 0.95)) * 1000;

            res.cookie(accessName, access_token, { ...cookieOpts, maxAge: accessTtl });
            if (refresh_token) {
                res.cookie(refreshName, refresh_token, { ...cookieOpts, maxAge: refreshTtl });
            }

            res.clearCookie('oidc_state', cookieOpts);
            res.clearCookie('oidc_nonce', cookieOpts);
            res.clearCookie('pkce_verifier', cookieOpts);

            return res.redirect(this.cfg.getOrThrow<string>('APP_BASE_URL'));
        } catch (err) {
            const cookieOpts = this.getCookieOptions();
            res.clearCookie('oidc_state', cookieOpts);
            res.clearCookie('oidc_nonce', cookieOpts);
            res.clearCookie('pkce_verifier', cookieOpts);
            console.log('Auth callback error:', err);
            return res.redirect(`${this.cfg.getOrThrow<string>('APP_BASE_URL')}/401`);
        }
    }

    @Post('refresh')
    async refresh(@Req() req, @Res() res) {
        const accessName = this.cfg.getOrThrow<string>('COOKIE_NAME_ACCESS');
        const refreshName = this.cfg.getOrThrow<string>('COOKIE_NAME_REFRESH');

        const refreshToken = req.cookies[refreshName];
        if (!refreshToken) {
            return res.status(401).json({ error: 'no_refresh' });
        }

        const cookieOpts = this.getCookieOptions();

        try {
            const json = await this.AuthService.refreshToken({
                tokenEndpoint: this.cfg.getOrThrow<string>('KEYCLOAK_TOKEN_ENDPOINT'),
                clientId: this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID'),
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
        } catch (err) {
            res.clearCookie(accessName, cookieOpts);
            res.clearCookie(refreshName, cookieOpts);
            return res.status(401).json({ error: 'refresh_failed' });
        }
    }

    @Post('logout')
    async logout(@Req() req, @Res() res) {
        const accessName = this.cfg.getOrThrow<string>('COOKIE_NAME_ACCESS');
        const refreshName = this.cfg.getOrThrow<string>('COOKIE_NAME_REFRESH');
        const clientId = this.cfg.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
        const kcLogoutPost = this.cfg.getOrThrow<string>('KEYCLOAK_LOGOUT_ENDPOINT');
        const appBase = this.cfg.getOrThrow<string>('APP_BASE_URL');

        const kcLogoutGet = this.cfg.get<string>('OIDC_LOGOUT_ENDPOINT');
        const postLogout = this.cfg.get<string>('OIDC_POST_LOGOUT_REDIRECT_URI') ?? `${appBase}/login`;

        const cookieOpts = this.getCookieOptions();
        const refreshToken = req.cookies?.[refreshName];

        try {
            await this.AuthService.frontChannelLogout({
                logoutEndpoint: kcLogoutPost,
                clientId,
                refreshToken,
            });
        } catch {}

        res.clearCookie(accessName, cookieOpts);
        res.clearCookie(refreshName, cookieOpts);

        if (kcLogoutGet) {
            const url = new URL(kcLogoutGet);
            url.searchParams.set('post_logout_redirect_uri', postLogout);
            return res.redirect(url.toString());
        }

        return res.json({ ok: true });
    }
}
