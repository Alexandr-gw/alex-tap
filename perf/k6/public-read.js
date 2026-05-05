import { sleep } from "k6";
import { baseConfig, defaultThresholds, numberEnv } from "./lib/config.js";
import { dayString } from "./lib/dates.js";
import { getPublicCatalog } from "./lib/fixtures.js";
import { expectStatus, getJson } from "./lib/http.js";

const config = baseConfig();

export const options = {
  thresholds: defaultThresholds(),
  scenarios: {
    public_read: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: numberEnv("K6_PUBLIC_VUS", 10) },
        { duration: "1m", target: numberEnv("K6_PUBLIC_VUS", 10) },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
};

export function setup() {
  return {
    ...getPublicCatalog(config),
  };
}

export default function (data) {
  const serviceList = getJson(
    config.apiBaseUrl,
    `/api/v1/public/companies/${config.publicCompanySlug}/services`,
  );
  expectStatus(serviceList, 200, "public list services");

  const serviceDetail = getJson(
    config.apiBaseUrl,
    `/api/v1/public/companies/${config.publicCompanySlug}/services/${data.serviceSlug}`,
  );
  expectStatus(serviceDetail, 200, "public service detail");

  const slotsDay = getJson(
    config.apiBaseUrl,
    `/api/v1/public/slots/day?companyId=${encodeURIComponent(config.companyId)}&serviceId=${encodeURIComponent(data.serviceId)}&day=${encodeURIComponent(dayString(1))}`,
  );
  expectStatus(slotsDay, 200, "public day slots");

  sleep(numberEnv("K6_SLEEP_SECONDS", 1));
}
