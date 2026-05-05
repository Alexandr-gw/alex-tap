import { sleep } from "k6";
import { baseConfig, numberEnv } from "./lib/config.js";
import { expectStatus, getJson } from "./lib/http.js";

const config = baseConfig();

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<2500"],
  },
  scenarios: {
    site_smoke: {
      executor: "constant-vus",
      vus: numberEnv("K6_SITE_VUS", 1),
      duration: "30s",
      gracefulStop: "10s",
    },
  },
};

export default function () {
  const home = getJson(config.appBaseUrl, "/");
  expectStatus(home, 200, "home page");

  const architecture = getJson(config.appBaseUrl, "/architecture");
  expectStatus(architecture, 200, "architecture page");

  const booking = getJson(config.appBaseUrl, `/book/${config.publicCompanySlug}`);
  expectStatus(booking, 200, "booking page");

  sleep(numberEnv("K6_SLEEP_SECONDS", 1));
}
