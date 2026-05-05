import { sleep } from "k6";
import {
  authHeaders,
  baseConfig,
  defaultThresholds,
  ensureStaffAuth,
  numberEnv,
} from "./lib/config.js";
import { getScheduleWindow } from "./lib/fixtures.js";
import { expectStatus, getJson } from "./lib/http.js";

const config = baseConfig();

export const options = {
  thresholds: defaultThresholds(),
  scenarios: {
    dashboard_read: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: numberEnv("K6_DASHBOARD_VUS", 5) },
        { duration: "1m", target: numberEnv("K6_DASHBOARD_VUS", 5) },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
};

export function setup() {
  ensureStaffAuth(config);
  return {
    headers: authHeaders(config),
    ...getScheduleWindow(config),
  };
}

export default function (data) {
  const params = { headers: data.headers };

  const me = getJson(config.apiBaseUrl, "/me", params);
  expectStatus(me, 200, "me");

  const workers = getJson(config.apiBaseUrl, "/api/v1/workers", params);
  expectStatus(workers, 200, "workers");

  const jobs = getJson(
    config.apiBaseUrl,
    `/api/v1/jobs?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}&take=100`,
    params,
  );
  expectStatus(jobs, 200, "jobs list");

  const alerts = getJson(config.apiBaseUrl, "/api/v1/alerts/unread-count", params);
  expectStatus(alerts, 200, "alerts unread count");

  sleep(numberEnv("K6_SLEEP_SECONDS", 1));
}
