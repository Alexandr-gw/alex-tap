export declare class AuthService {
    generatePkce(): {
        codeVerifier: string;
        codeChallenge: string;
    };
    buildAuthUrl(params: {
        authorizationEndpoint: string;
        clientId: string;
        redirectUri: string;
        challenge: string;
        state: string;
        nonce: string;
    }): string;
    exchangeCodeForToken(params: {
        tokenEndpoint: string;
        clientId: string;
        code: string;
        codeVerifier: string;
        redirectUri: string;
    }): Promise<any>;
    refreshToken(params: {
        tokenEndpoint: string;
        clientId: string;
        refreshToken: string;
    }): Promise<any>;
    frontChannelLogout(params: {
        logoutEndpoint: string;
        clientId: string;
        refreshToken?: string;
    }): Promise<string>;
}
