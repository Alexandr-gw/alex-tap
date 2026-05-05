import http from "k6/http";
import { check, fail } from "k6";

function normalizeBaseUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/$/, "");
}

export function url(apiBaseUrl, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(apiBaseUrl)}${normalizedPath}`;
}

export function getJson(apiBaseUrl, path, params = {}) {
  return http.get(url(apiBaseUrl, path), params);
}

export function postJson(apiBaseUrl, path, body, params = {}) {
  const headers = {
    "content-type": "application/json",
    ...(params.headers || {}),
  };

  return http.post(url(apiBaseUrl, path), JSON.stringify(body), {
    ...params,
    headers,
  });
}

export function patchJson(apiBaseUrl, path, body, params = {}) {
  const headers = {
    "content-type": "application/json",
    ...(params.headers || {}),
  };

  return http.patch(url(apiBaseUrl, path), JSON.stringify(body), {
    ...params,
    headers,
  });
}

export function deleteRequest(apiBaseUrl, path, params = {}) {
  return http.del(url(apiBaseUrl, path), null, params);
}

export function expectStatus(response, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const ok = check(response, {
    [`${label} status is ${allowed.join(" or ")}`]: (res) =>
      allowed.includes(res.status),
  });

  if (!ok) {
    fail(`${label} failed with status ${response.status}: ${response.body}`);
  }
}
