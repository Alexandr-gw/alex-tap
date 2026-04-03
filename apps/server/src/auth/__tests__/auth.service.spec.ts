import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const fetchMock = jest.fn();
  const service = new AuthService();

  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = fetchMock;
  });

  afterAll(() => {
    delete (global as any).fetch;
  });

  it('generates a URL-safe PKCE verifier and challenge', () => {
    const result = service.generatePkce();

    expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.codeVerifier).toHaveLength(43);
    expect(result.codeChallenge).toHaveLength(43);
    expect(result.codeChallenge).not.toBe(result.codeVerifier);
  });

  it('builds an authorization URL with the expected OIDC parameters', () => {
    const url = new URL(service.buildAuthUrl({
      authorizationEndpoint: 'https://id.example.com/auth',
      clientId: 'client_123',
      redirectUri: 'https://app.example.com/auth/callback',
      challenge: 'challenge_123',
      state: 'state_123',
      nonce: 'nonce_123',
    }));

    expect(url.origin + url.pathname).toBe('https://id.example.com/auth');
    expect(url.searchParams.get('client_id')).toBe('client_123');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/auth/callback');
    expect(url.searchParams.get('code_challenge')).toBe('challenge_123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state_123');
    expect(url.searchParams.get('nonce')).toBe('nonce_123');
  });

  it('exchanges an authorization code for tokens', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        access_token: 'access_123',
        refresh_token: 'refresh_123',
      })),
    });

    const result = await service.exchangeCodeForToken({
      tokenEndpoint: 'https://id.example.com/token',
      clientId: 'client_123',
      code: 'code_123',
      codeVerifier: 'verifier_123',
      redirectUri: 'https://app.example.com/auth/callback',
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(options.body as string);

    expect(fetchMock).toHaveBeenCalledWith('https://id.example.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: expect.any(String),
    });
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('client_123');
    expect(body.get('code')).toBe('code_123');
    expect(body.get('code_verifier')).toBe('verifier_123');
    expect(body.get('redirect_uri')).toBe('https://app.example.com/auth/callback');
    expect(result).toEqual({
      access_token: 'access_123',
      refresh_token: 'refresh_123',
    });
  });

  it('wraps token exchange failures with response details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('invalid_grant'),
    });

    await expect(
      service.exchangeCodeForToken({
        tokenEndpoint: 'https://id.example.com/token',
        clientId: 'client_123',
        code: 'bad_code',
        codeVerifier: 'verifier_123',
        redirectUri: 'https://app.example.com/auth/callback',
      }),
    ).rejects.toThrow('400 Bad Request :: invalid_grant');
  });

  it('refreshes tokens and posts the refresh token grant payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'access_456',
        id_token: 'id_456',
      }),
    });

    const result = await service.refreshToken({
      tokenEndpoint: 'https://id.example.com/token',
      clientId: 'client_123',
      refreshToken: 'refresh_456',
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(options.body as string);

    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('client_id')).toBe('client_123');
    expect(body.get('refresh_token')).toBe('refresh_456');
    expect(result).toEqual({
      access_token: 'access_456',
      id_token: 'id_456',
    });
  });

  it('returns a wrapped refresh error when the token endpoint rejects the request', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(
      service.refreshToken({
        tokenEndpoint: 'https://id.example.com/token',
        clientId: 'client_123',
        refreshToken: 'refresh_456',
      }),
    ).rejects.toThrow('Token refresh failed: Token refresh failed: Unauthorized');
  });

  it('posts a front-channel logout request and includes the refresh token when provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('logged_out'),
    });

    const result = await service.frontChannelLogout({
      logoutEndpoint: 'https://id.example.com/logout',
      clientId: 'client_123',
      refreshToken: 'refresh_789',
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(options.body as string);

    expect(body.get('client_id')).toBe('client_123');
    expect(body.get('refresh_token')).toBe('refresh_789');
    expect(result).toBe('logged_out');
  });

  it('returns a wrapped logout error when the provider rejects logout', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    });

    await expect(
      service.frontChannelLogout({
        logoutEndpoint: 'https://id.example.com/logout',
        clientId: 'client_123',
      }),
    ).rejects.toThrow('Front-channel logout failed: Front-channel logout failed: Forbidden');
  });
});
