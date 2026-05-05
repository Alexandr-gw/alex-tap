export function env(name, fallback) {
  const value = __ENV[name];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

export function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function numberEnv(name, fallback) {
  const value = env(name);
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}=${value}`);
  }

  return parsed;
}

export function boolEnv(name, fallback = false) {
  const value = env(name);
  if (value === undefined) {
    return fallback;
  }

  return value === "true" || value === "1";
}

export function baseConfig() {
  const target = env("TARGET_ENV", "local");
  const prodDefaults = {
    appBaseUrl: "https://alex-tap.alexkutsenko.dev",
    apiBaseUrl: "https://api.alexkutsenko.dev",
    publicCompanySlug: "alex-tap-demo",
    companyId: "demo-company",
    timezone: "America/Edmonton",
  };
  const localDefaults = {
    appBaseUrl: "http://localhost:3000",
    apiBaseUrl: "http://localhost:3001",
    publicCompanySlug: "alex-tap-demo",
    companyId: "demo-company",
    timezone: "America/Edmonton",
  };
  const defaults = target === "prod" ? prodDefaults : localDefaults;

  return {
    target,
    appBaseUrl: env("APP_BASE_URL", defaults.appBaseUrl),
    apiBaseUrl: env("API_BASE_URL", defaults.apiBaseUrl),
    publicCompanySlug: env("PUBLIC_COMPANY_SLUG", defaults.publicCompanySlug),
    companyId: env("COMPANY_ID", defaults.companyId),
    authToken: env("AUTH_TOKEN"),
    authCookie: env("AUTH_COOKIE"),
    timezone: env("COMPANY_TIMEZONE", defaults.timezone),
    allowProdWrites: boolEnv("ALLOW_PROD_WRITES", false),
  };
}

export function defaultThresholds() {
  return {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
  };
}

export function authHeaders(config) {
  const headers = {};

  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  if (config.authCookie) {
    headers.Cookie = config.authCookie;
  }

  if (config.companyId) {
    headers["x-company-id"] = config.companyId;
  }

  return headers;
}

export function ensureStaffAuth(config) {
  if (!config.authToken && !config.authCookie) {
    throw new Error(
      "Staff scenario requires AUTH_TOKEN or AUTH_COOKIE. See perf/k6/README.md.",
    );
  }
}

export function isLikelyProductionTarget(config) {
  return (
    config.target === "prod" ||
    /\.alexkutsenko\.dev$/i.test(new URL(config.appBaseUrl).hostname) ||
    /\.alexkutsenko\.dev$/i.test(new URL(config.apiBaseUrl).hostname)
  );
}

export function ensureWritesAllowed(config) {
  if (isLikelyProductionTarget(config) && !config.allowProdWrites) {
    throw new Error(
      "Refusing to run mutating scenario against a likely production target without ALLOW_PROD_WRITES=true.",
    );
  }
}

