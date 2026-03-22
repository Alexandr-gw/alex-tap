import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const THEME_NAME = "keycloak-theme";
const WEB_CLIENT_ID = "web-app";
const API_CLIENT_ID = "api";
const FIRST_BROKER_LOGIN_FLOW_ALIAS = "first broker login";

loadEnvFile(path.join(__dirname, "..", ".env"));

const LOCAL_USERS = [
    {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@gmail.com",
        firstName: "Ada",
        lastName: "Admin",
        password: "admin",
        roles: ["admin"]
    },
    {
        id: "00000000-0000-0000-0000-000000000002",
        email: "manager@gmail.com",
        firstName: "Mina",
        lastName: "Manager",
        password: "manager",
        roles: ["manager"]
    },
    {
        id: "00000000-0000-0000-0000-000000000003",
        email: "worker@gmail.com",
        firstName: "Will",
        lastName: "Worker",
        password: "worker",
        roles: ["worker"]
    },
    {
        id: "00000000-0000-0000-0000-000000000004",
        email: "client@gmail.com",
        firstName: "Casey",
        lastName: "Client",
        password: "client",
        roles: ["client"]
    },
    {
        id: "00000000-0000-0000-0000-000000000005",
        email: "worker.one@gmail.com",
        firstName: "Wade",
        lastName: "Worker",
        password: "worker",
        roles: ["worker"]
    },
    {
        id: "00000000-0000-0000-0000-000000000006",
        email: "worker.two@gmail.com",
        firstName: "Wren",
        lastName: "Worker",
        password: "worker",
        roles: ["worker"]
    },
    {
        id: "00000000-0000-0000-0000-000000000007",
        email: "worker.three@gmail.com",
        firstName: "West",
        lastName: "Worker",
        password: "worker",
        roles: ["worker"]
    }
];

const REALM_ROLES = ["admin", "manager", "worker", "client"];

const ENVIRONMENTS = [
    {
        key: "local",
        realm: "alex-tap-local",
        displayName: "Alex Tap Local",
        appOrigin: "http://localhost:3000",
        serverOrigin: "http://localhost:3001",
        smtp: {
            host: "mailhog",
            port: "1025",
            from: "no-reply@alex-tap.local",
            fromDisplayName: "Alex Tap Local",
            replyTo: "support@alex-tap.local",
            ssl: "false",
            starttls: "false",
            auth: "false"
        },
        users: LOCAL_USERS
    },
    {
        key: "staging",
        realm: "alex-tap-staging",
        displayName: "Alex Tap Staging",
        appOrigin: "https://staging.alex-tap.example.com",
        serverOrigin: "https://api-staging.alex-tap.example.com",
        smtp: undefined,
        users: []
    },
    {
        key: "prod",
        realm: "alex-tap-prod",
        displayName: "Alex Tap Production",
        appOrigin: "https://app.alex-tap.example.com",
        serverOrigin: "https://api.alex-tap.example.com",
        smtp: undefined,
        users: []
    }
];

function createApiAudienceProtocolMapper() {
    return {
        name: `${API_CLIENT_ID}-audience`,
        protocol: "openid-connect",
        protocolMapper: "oidc-audience-mapper",
        consentRequired: false,
        config: {
            "included.client.audience": API_CLIENT_ID,
            "access.token.claim": "true",
            "id.token.claim": "false"
        }
    };
}

function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const separatorIndex = line.indexOf("=");

        if (separatorIndex < 0) {
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

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

function getEnvironmentSecret(environment, name) {
    return (
        process.env[`KEYCLOAK_${environment.key.toUpperCase()}_${name}`] ??
        process.env[`KEYCLOAK_${name}`] ??
        ""
    ).trim();
}

function createIdentityProvider({ alias, providerId, displayName, clientId, clientSecret }) {
    return {
        alias,
        displayName,
        providerId,
        enabled: true,
        updateProfileFirstLoginMode: "off",
        trustEmail: true,
        storeToken: false,
        addReadTokenRoleOnCreate: false,
        authenticateByDefault: false,
        linkOnly: false,
        hideOnLogin: false,
        firstBrokerLoginFlowAlias: FIRST_BROKER_LOGIN_FLOW_ALIAS,
        config: {
            syncMode: "LEGACY",
            clientId,
            clientSecret
        }
    };
}

function createHardcodedManagerMapper(identityProviderAlias) {
    return {
        name: `${identityProviderAlias}-grant-manager-role`,
        identityProviderAlias,
        identityProviderMapper: "oidc-hardcoded-role-idp-mapper",
        config: {
            role: "manager"
        }
    };
}

function createSocialLoginConfig(environment) {
    const googleClientId = getEnvironmentSecret(environment, "GOOGLE_CLIENT_ID");
    const googleClientSecret = getEnvironmentSecret(environment, "GOOGLE_CLIENT_SECRET");
    const githubClientId = getEnvironmentSecret(environment, "GITHUB_CLIENT_ID");
    const githubClientSecret = getEnvironmentSecret(environment, "GITHUB_CLIENT_SECRET");

    const identityProviders = [];
    const identityProviderMappers = [];

    if (googleClientId && googleClientSecret) {
        identityProviders.push(
            createIdentityProvider({
                alias: "google",
                providerId: "google",
                displayName: "Google",
                clientId: googleClientId,
                clientSecret: googleClientSecret
            })
        );
        identityProviderMappers.push(createHardcodedManagerMapper("google"));
    }

    if (githubClientId && githubClientSecret) {
        identityProviders.push(
            createIdentityProvider({
                alias: "github",
                providerId: "github",
                displayName: "GitHub",
                clientId: githubClientId,
                clientSecret: githubClientSecret
            })
        );
        identityProviderMappers.push(createHardcodedManagerMapper("github"));
    }

    return { identityProviders, identityProviderMappers };
}

function createRealmUser(user) {
    return {
        id: user.id,
        username: user.email,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true,
        emailVerified: true,
        realmRoles: user.roles,
        requiredActions: [],
        credentials: [
            {
                type: "password",
                value: user.password,
                temporary: false
            }
        ]
    };
}

function createRealmImport(environment) {
    const { identityProviders, identityProviderMappers } = createSocialLoginConfig(environment);

    return {
        realm: environment.realm,
        displayName: environment.displayName,
        enabled: true,
        sslRequired: "external",
        registrationAllowed: false,
        resetPasswordAllowed: true,
        rememberMe: false,
        verifyEmail: false,
        loginWithEmailAllowed: true,
        duplicateEmailsAllowed: true,
        editUsernameAllowed: false,
        loginTheme: THEME_NAME,
        ...(environment.smtp ? { smtpServer: environment.smtp } : {}),
        roles: {
            realm: REALM_ROLES.map(name => ({
                name,
                description: `${name} access for Alex Tap`
            }))
        },
        clients: [
            {
                clientId: WEB_CLIENT_ID,
                name: `${environment.displayName} Web App`,
                description: "Public PKCE client used by the Nest auth controller.",
                enabled: true,
                protocol: "openid-connect",
                publicClient: true,
                standardFlowEnabled: true,
                directAccessGrantsEnabled: false,
                implicitFlowEnabled: false,
                serviceAccountsEnabled: false,
                frontchannelLogout: true,
                rootUrl: environment.appOrigin,
                baseUrl: environment.appOrigin,
                redirectUris: [`${environment.serverOrigin}/auth/callback`],
                webOrigins: [environment.appOrigin, environment.serverOrigin],
                protocolMappers: [createApiAudienceProtocolMapper()],
                attributes: {
                    "pkce.code.challenge.method": "S256",
                    "post.logout.redirect.uris": `${environment.appOrigin}/*`
                }
            },
            {
                clientId: API_CLIENT_ID,
                name: `${environment.displayName} API`,
                description: "Audience marker for server-side JWT verification.",
                enabled: true,
                protocol: "openid-connect",
                bearerOnly: true,
                standardFlowEnabled: false,
                directAccessGrantsEnabled: false,
                implicitFlowEnabled: false,
                serviceAccountsEnabled: false
            }
        ],
        ...(identityProviders.length > 0 ? { identityProviders } : {}),
        ...(identityProviderMappers.length > 0 ? { identityProviderMappers } : {}),
        users: environment.users.map(createRealmUser)
    };
}

for (const environment of ENVIRONMENTS) {
    const realmImport = createRealmImport(environment);
    const outputDir = path.join(__dirname, "generated", environment.key);
    mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, `${environment.realm}-realm.json`);
    writeFileSync(filePath, `${JSON.stringify(realmImport, null, 2)}\n`, "utf8");
    console.log(`Wrote ${filePath}`);
}
