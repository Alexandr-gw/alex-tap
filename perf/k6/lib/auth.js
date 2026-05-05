import http from "k6/http";
import { fail } from "k6";

function toFormBody(fields) {
  return Object.entries(fields)
    .map(([key, value]) => {
      const normalized = value === undefined || value === null ? "" : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`;
    })
    .join("&");
}

function findLoginAction(html) {
  const match = html.match(/"loginAction": "([^"]+)"/);
  if (!match) {
    fail("Could not locate Keycloak loginAction in auth page HTML.");
  }

  return match[1].replaceAll("\\/", "/");
}

function cookiesForUrlAsHeader(jar, url) {
  const cookies = jar.cookiesForURL(url);
  const parts = [];

  Object.entries(cookies).forEach(([name, values]) => {
    if (Array.isArray(values)) {
      values.forEach((value) => {
        parts.push(`${name}=${value}`);
      });
      return;
    }

    if (values) {
      parts.push(`${name}=${values}`);
    }
  });

  return parts.join("; ");
}

export function loginWithPassword(config, creds) {
  const jar = http.cookieJar();

  const loginUrlResponse = http.get(
    `${config.apiBaseUrl}/auth/login-url?returnTo=${encodeURIComponent("/app")}`,
    {
      redirects: 0,
      headers: {
        accept: "application/json",
      },
    },
  );

  if (loginUrlResponse.status !== 200) {
    fail(`auth/login-url failed: ${loginUrlResponse.status} ${loginUrlResponse.body}`);
  }

  const authUrl = loginUrlResponse.json("url");
  if (!authUrl) {
    fail("auth/login-url did not return an authorization URL.");
  }

  const authPage = http.get(authUrl, {
    redirects: 0,
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (authPage.status !== 200) {
    fail(`Keycloak auth page failed: ${authPage.status}`);
  }

  const loginAction = findLoginAction(authPage.body);

  const postLogin = http.post(
    loginAction,
    toFormBody({
      username: creds.username,
      password: creds.password,
      credentialId: "",
    }),
    {
      redirects: 0,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: authUrl,
      },
    },
  );

  if (postLogin.status !== 302) {
    fail(`Keycloak login POST failed: ${postLogin.status} ${postLogin.body}`);
  }

  const callbackUrl = postLogin.headers.Location;
  if (!callbackUrl) {
    fail("Keycloak login POST did not return a callback URL.");
  }

  const callbackResponse = http.get(callbackUrl, {
    redirects: 0,
    headers: {
      referer: authUrl,
    },
  });

  if (callbackResponse.status !== 302) {
    fail(`API auth callback failed: ${callbackResponse.status} ${callbackResponse.body}`);
  }

  const cookieHeader = cookiesForUrlAsHeader(jar, config.apiBaseUrl);
  if (
    !cookieHeader ||
    (!cookieHeader.includes("accessToken=") && !cookieHeader.includes("token="))
  ) {
    fail("API auth callback did not establish an access cookie.");
  }

  return cookieHeader;
}
