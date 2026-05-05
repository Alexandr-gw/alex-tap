import { group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { baseConfig, defaultThresholds } from "./lib/config.js";
import { dayString } from "./lib/dates.js";
import { loginWithPassword } from "./lib/auth.js";
import { expectStatus, getJson } from "./lib/http.js";

const config = baseConfig();

const endpointDuration = new Trend("endpoint_duration", true);
const endpointFailures = new Counter("endpoint_failures");
const healthzDuration = new Trend("healthz_duration", true);
const meDuration = new Trend("me_duration", true);
const jobsDuration = new Trend("jobs_duration", true);
const servicesDuration = new Trend("services_duration", true);
const workersDuration = new Trend("workers_duration", true);
const workerSlotsDuration = new Trend("worker_slots_duration", true);
const publicSlotsDuration = new Trend("public_slots_duration", true);

const endpointTrendMap = {
  healthz: healthzDuration,
  me: meDuration,
  jobs: jobsDuration,
  services: servicesDuration,
  workers: workersDuration,
  worker_slots: workerSlotsDuration,
  public_slots: publicSlotsDuration,
};

function recordEndpoint(name, response) {
  endpointDuration.add(response.timings.duration, { endpoint: name });
  if (endpointTrendMap[name]) {
    endpointTrendMap[name].add(response.timings.duration);
  }
  if (response.status >= 400 || response.status === 0) {
    endpointFailures.add(1, { endpoint: name, status: String(response.status) });
  }
}

function checkedGet(name, path, params = {}) {
  const response = getJson(config.apiBaseUrl, path, params);
  recordEndpoint(name, response);
  expectStatus(response, 200, name);
  return response;
}

export const options = {
  thresholds: {
    ...defaultThresholds(),
    http_req_failed: ["rate<0.01"],
    "endpoint_failures{endpoint:healthz}": ["count==0"],
    "endpoint_failures{endpoint:me}": ["count==0"],
    "endpoint_failures{endpoint:jobs}": ["count==0"],
    "endpoint_failures{endpoint:services}": ["count==0"],
    "endpoint_failures{endpoint:workers}": ["count==0"],
    "endpoint_failures{endpoint:worker_slots}": ["count==0"],
    "endpoint_failures{endpoint:public_slots}": ["count==0"],
  },
  scenarios: {
    conservative_prod_read: {
      executor: "constant-vus",
      vus: 1,
      duration: "25s",
      gracefulStop: "10s",
    },
  },
};

export function setup() {
  const authCookie = loginWithPassword(config, {
    username: "manager@gmail.com",
    password: "manager",
  });
  const headers = {
    Cookie: authCookie,
    "x-company-id": config.companyId,
  };

  const servicesResponse = checkedGet("services_setup", "/api/v1/services?page=1&pageSize=20", {
    headers,
  });
  const workersResponse = checkedGet("workers_setup", "/api/v1/workers", { headers });

  const services = servicesResponse.json("items") || [];
  const workers = workersResponse.json() || [];

  if (!Array.isArray(services) || services.length === 0) {
    throw new Error("No services returned for authenticated setup.");
  }

  if (!Array.isArray(workers) || workers.length === 0) {
    throw new Error("No workers returned for authenticated setup.");
  }

  return {
    headers,
    serviceId: services[0].id,
    workerId: workers[0].id,
    today: dayString(0),
    tomorrow: dayString(1),
  };
}

export default function (data) {
  group("production_read_profile", () => {
    checkedGet("healthz", "/healthz");
    checkedGet("me", "/me", { headers: data.headers });
    checkedGet("jobs", "/api/v1/jobs?take=20", { headers: data.headers });
    checkedGet("services", "/api/v1/services?page=1&pageSize=20", { headers: data.headers });
    checkedGet("workers", "/api/v1/workers", { headers: data.headers });
    checkedGet(
      "worker_slots",
      `/api/v1/workers/${encodeURIComponent(data.workerId)}/slots?serviceId=${encodeURIComponent(data.serviceId)}&from=${encodeURIComponent(`${data.today}T00:00:00.000Z`)}&to=${encodeURIComponent(`${data.tomorrow}T00:00:00.000Z`)}`,
      { headers: data.headers },
    );
    checkedGet(
      "public_slots",
      `/api/v1/public/slots?companyId=${encodeURIComponent(config.companyId)}&serviceId=${encodeURIComponent(data.serviceId)}&from=${encodeURIComponent(`${data.today}T00:00:00.000Z`)}&to=${encodeURIComponent(`${data.tomorrow}T00:00:00.000Z`)}`,
    );
  });

  sleep(3);
}
