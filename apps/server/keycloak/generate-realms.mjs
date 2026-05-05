import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(__dirname, 'generated');

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const result = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) {
            continue;
        }

        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

function resolveEnvFilePaths(rootDir, nodeEnv = process.env.NODE_ENV) {
    const normalized = typeof nodeEnv === 'string' && nodeEnv.trim().length > 0
        ? nodeEnv.trim()
        : undefined;

    const paths = [path.join(rootDir, '.env')];

    if (normalized) {
        paths.push(path.join(rootDir, `.env.${normalized}`));
    }

    if (normalized !== 'test') {
        paths.push(path.join(rootDir, '.env.local'));
    }

    if (normalized) {
        paths.push(path.join(rootDir, `.env.${normalized}.local`));
    }

    return [...new Set(paths)];
}

const fileEnv = resolveEnvFilePaths(serverRoot)
    .reduce((accumulator, envFilePath) => ({
        ...accumulator,
        ...parseEnvFile(envFilePath),
    }), {});
const env = {
    ...fileEnv,
    ...process.env,
};

function valueOrFallback(name, fallback) {
    const value = env[name];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function valueFromFirst(names, fallback = '') {
    for (const name of names) {
        const value = valueOrFallback(name, '');
        if (value) {
            return value;
        }
    }

    return fallback;
}

function parseOrigin(url, fallback) {
    try {
        return new URL(url).origin;
    } catch {
        return fallback;
    }
}

function parseSmtpFromAddress(email, fallbackDomain) {
    const normalized = typeof email === 'string' ? email.trim() : '';
    if (!normalized || !normalized.includes('@')) {
        return `no-reply@${fallbackDomain}`;
    }

    return normalized;
}

const realmRoles = ['admin', 'manager', 'worker', 'client'].map((name) => ({
    name,
    description: `${name} access for Alex Tap`,
}));

const loginTheme = 'alex-tap-keycloak-theme';

const localUsers = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin@gmail.com',
        email: 'admin@gmail.com',
        firstName: 'Ada',
        lastName: 'Admin',
        role: 'admin',
        password: 'admin',
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'manager@gmail.com',
        email: 'manager@gmail.com',
        firstName: 'Mina',
        lastName: 'Manager',
        role: 'manager',
        password: 'manager',
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'worker@gmail.com',
        email: 'worker@gmail.com',
        firstName: 'Will',
        lastName: 'Worker',
        role: 'worker',
        password: 'worker',
    },
    {
        id: '00000000-0000-0000-0000-000000000004',
        username: 'client@gmail.com',
        email: 'client@gmail.com',
        firstName: 'Casey',
        lastName: 'Client',
        role: 'client',
        password: 'client',
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        username: 'worker.one@gmail.com',
        email: 'worker.one@gmail.com',
        firstName: 'Wade',
        lastName: 'Worker',
        role: 'worker',
        password: 'worker',
    },
    {
        id: '00000000-0000-0000-0000-000000000006',
        username: 'worker.two@gmail.com',
        email: 'worker.two@gmail.com',
        firstName: 'Wren',
        lastName: 'Worker',
        role: 'worker',
        password: 'worker',
    },
    {
        id: '00000000-0000-0000-0000-000000000007',
        username: 'worker.three@gmail.com',
        email: 'worker.three@gmail.com',
        firstName: 'West',
        lastName: 'Worker',
        role: 'worker',
        password: 'worker',
    },
    {
        id: '00000000-0000-0000-0000-000000000008',
        username: 'manager-demo2@gmail.com',
        email: 'manager-demo2@gmail.com',
        firstName: 'Nora',
        lastName: 'Manager',
        role: 'manager',
        password: 'manager2',
    },
].map(({ role, password, ...user }) => ({
    ...user,
    enabled: true,
    emailVerified: true,
    realmRoles: [role],
    requiredActions: [],
    credentials: [
        {
            type: 'password',
            value: password,
            temporary: false,
        },
    ],
}));

function createSocialIdentityConfig({
    envPrefixes,
    includeGenericFallback = false,
}) {
    const envNames = (provider, field) => [
        ...envPrefixes.map((prefix) => `KEYCLOAK_${prefix}_${provider}_${field}`),
        ...(includeGenericFallback ? [`KEYCLOAK_${provider}_${field}`] : []),
    ];

    const identityProviders = [];
    const identityProviderMappers = [];

    const googleClientId = valueFromFirst(envNames('GOOGLE', 'CLIENT_ID'));
    const googleClientSecret = valueFromFirst(envNames('GOOGLE', 'CLIENT_SECRET'));
    if (googleClientId && googleClientSecret) {
        identityProviders.push({
            alias: 'google',
            displayName: 'Google',
            providerId: 'google',
            enabled: true,
            updateProfileFirstLoginMode: 'off',
            trustEmail: true,
            storeToken: false,
            addReadTokenRoleOnCreate: false,
            authenticateByDefault: false,
            linkOnly: false,
            hideOnLogin: false,
            firstBrokerLoginFlowAlias: 'first broker login',
            config: {
                syncMode: 'LEGACY',
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            },
        });
        identityProviderMappers.push({
            name: 'google-grant-manager-role',
            identityProviderAlias: 'google',
            identityProviderMapper: 'oidc-hardcoded-role-idp-mapper',
            config: {
                role: 'manager',
            },
        });
    }

    const githubClientId = valueFromFirst(envNames('GITHUB', 'CLIENT_ID'));
    const githubClientSecret = valueFromFirst(envNames('GITHUB', 'CLIENT_SECRET'));
    if (githubClientId && githubClientSecret) {
        identityProviders.push({
            alias: 'github',
            displayName: 'GitHub',
            providerId: 'github',
            enabled: true,
            updateProfileFirstLoginMode: 'off',
            trustEmail: true,
            storeToken: false,
            addReadTokenRoleOnCreate: false,
            authenticateByDefault: false,
            linkOnly: false,
            hideOnLogin: false,
            firstBrokerLoginFlowAlias: 'first broker login',
            config: {
                syncMode: 'LEGACY',
                clientId: githubClientId,
                clientSecret: githubClientSecret,
            },
        });
        identityProviderMappers.push({
            name: 'github-grant-manager-role',
            identityProviderAlias: 'github',
            identityProviderMapper: 'oidc-hardcoded-role-idp-mapper',
            config: {
                role: 'manager',
            },
        });
    }

    return {
        identityProviders,
        identityProviderMappers,
    };
}

function createRealm({
    realm,
    displayName,
    appBaseUrl,
    callbackUrl,
    clientId,
    apiAudience,
    includeUsers = false,
    smtpServer,
    identityProviders = [],
    identityProviderMappers = [],
}) {
    const appOrigin = parseOrigin(appBaseUrl, appBaseUrl);
    const callbackOrigin = parseOrigin(callbackUrl, callbackUrl);

    const realmJson = {
        realm,
        displayName,
        enabled: true,
        sslRequired: 'external',
        registrationAllowed: false,
        resetPasswordAllowed: true,
        rememberMe: false,
        verifyEmail: false,
        loginWithEmailAllowed: true,
        duplicateEmailsAllowed: true,
        editUsernameAllowed: false,
        loginTheme,
        roles: {
            realm: realmRoles,
        },
        clients: [
            {
                clientId,
                name: `${displayName} Web App`,
                description: 'Public PKCE client used by the Nest auth controller.',
                enabled: true,
                protocol: 'openid-connect',
                publicClient: true,
                standardFlowEnabled: true,
                directAccessGrantsEnabled: false,
                implicitFlowEnabled: false,
                serviceAccountsEnabled: false,
                frontchannelLogout: true,
                rootUrl: appBaseUrl,
                baseUrl: appBaseUrl,
                redirectUris: [callbackUrl],
                webOrigins: [...new Set([appOrigin, callbackOrigin])],
                protocolMappers: [
                    {
                        name: 'api-audience',
                        protocol: 'openid-connect',
                        protocolMapper: 'oidc-audience-mapper',
                        consentRequired: false,
                        config: {
                            'included.client.audience': apiAudience,
                            'access.token.claim': 'true',
                            'id.token.claim': 'false',
                        },
                    },
                ],
                attributes: {
                    'pkce.code.challenge.method': 'S256',
                    'post.logout.redirect.uris': `${appBaseUrl.replace(/\/$/, '')}/*`,
                },
            },
            {
                clientId: apiAudience,
                name: `${displayName} API`,
                description: 'Audience marker for server-side JWT verification.',
                enabled: true,
                protocol: 'openid-connect',
                bearerOnly: true,
                standardFlowEnabled: false,
                directAccessGrantsEnabled: false,
                implicitFlowEnabled: false,
                serviceAccountsEnabled: false,
            },
        ],
        users: includeUsers ? localUsers : [],
    };

    if (smtpServer) {
        realmJson.smtpServer = smtpServer;
    }

    if (identityProviders.length > 0) {
        realmJson.identityProviders = identityProviders;
    }

    if (identityProviderMappers.length > 0) {
        realmJson.identityProviderMappers = identityProviderMappers;
    }

    return realmJson;
}

const localRealm = valueOrFallback('KEYCLOAK_REALM', 'alex-tap-local');
const localAppBaseUrl = valueOrFallback('APP_BASE_URL', 'http://localhost:3000');
const localCallbackUrl = valueOrFallback('OIDC_REDIRECT_URI', 'http://localhost:3001/auth/callback');
const localClientId = valueOrFallback('KEYCLOAK_CLIENT_ID', 'web-app');
const localApiAudience = valueOrFallback('API_AUDIENCE', 'api');
const notifyFromEmail = parseSmtpFromAddress(valueOrFallback('NOTIFY_FROM_EMAIL', ''), 'alex-tap.local');
const notifyDomain = notifyFromEmail.split('@')[1] ?? 'alex-tap.local';

const localSocialIdentityConfig = createSocialIdentityConfig({
    envPrefixes: ['LOCAL'],
});

// Keep hosted realm metadata in sync with the deployed domains and realm names.
const hostedRealmTargets = [
    {
        directory: 'staging',
        filename: 'alex-tap-staging-realm.json',
        realm: 'alex-tap-staging',
        displayName: 'Alex Tap Staging',
        appBaseUrl: 'https://staging.alexkutsenko.dev',
        apiBaseUrl: 'https://api-staging.alexkutsenko.dev',
    },
    {
        directory: 'prod',
        filename: 'alex-tap-realm.json',
        realm: 'alex-tap',
        displayName: 'Alex Tap Production',
        appBaseUrl: 'https://alexkutsenko.dev',
        apiBaseUrl: 'https://api.alexkutsenko.dev',
    },
];

const realms = [
    {
        directory: 'local',
        filename: 'alex-tap-local-realm.json',
        json: createRealm({
            realm: localRealm,
            displayName: 'Alex Tap Local',
            appBaseUrl: localAppBaseUrl,
            callbackUrl: localCallbackUrl,
            clientId: localClientId,
            apiAudience: localApiAudience,
            includeUsers: true,
            smtpServer: {
                host: 'mailhog',
                port: '1025',
                from: notifyFromEmail,
                fromDisplayName: 'Alex Tap Local',
                replyTo: `support@${notifyDomain}`,
                ssl: 'false',
                starttls: 'false',
                auth: 'false',
            },
            identityProviders: localSocialIdentityConfig.identityProviders,
            identityProviderMappers: localSocialIdentityConfig.identityProviderMappers,
        }),
    },
    ...hostedRealmTargets.map(({ directory, filename, realm, displayName, appBaseUrl, apiBaseUrl }) => {
        const socialIdentityConfig = createSocialIdentityConfig({
            envPrefixes: [directory.toUpperCase()],
            includeGenericFallback: directory === 'prod',
        });

        return {
            directory,
            filename,
            json: createRealm({
                realm,
                displayName,
                appBaseUrl,
                callbackUrl: `${apiBaseUrl}/auth/callback`,
                clientId: 'web-app',
                apiAudience: 'api',
                includeUsers: true,
                identityProviders: socialIdentityConfig.identityProviders,
                identityProviderMappers: socialIdentityConfig.identityProviderMappers,
            }),
        };
    }),
];

for (const realm of realms) {
    const targetDir = path.join(generatedRoot, realm.directory);
    const targetFile = path.join(targetDir, realm.filename);

    fs.mkdirSync(targetDir, { recursive: true });
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === realm.filename) {
            continue;
        }

        fs.rmSync(path.join(targetDir, entry.name));
    }
    fs.writeFileSync(targetFile, `${JSON.stringify(realm.json, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(serverRoot, targetFile)}`);
}
