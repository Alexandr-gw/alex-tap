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

@Post('refresh')

@Post('logout')
}
