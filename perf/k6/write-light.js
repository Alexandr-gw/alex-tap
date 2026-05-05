import { sleep } from "k6";
import {
  authHeaders,
  baseConfig,
  defaultThresholds,
  ensureStaffAuth,
  ensureWritesAllowed,
  numberEnv,
} from "./lib/config.js";
import { isoRangeForUpcomingHour } from "./lib/dates.js";
import { expectStatus, deleteRequest, getJson, postJson } from "./lib/http.js";

const config = baseConfig();

function randomString(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return output;
}

export const options = {
  thresholds: {
    ...defaultThresholds(),
    http_req_failed: ["rate<0.05"],
  },
  scenarios: {
    write_light: {
      executor: "constant-vus",
      vus: numberEnv("K6_WRITE_VUS", 1),
      duration: "45s",
      gracefulStop: "15s",
    },
  },
};

export function setup() {
  ensureStaffAuth(config);
  ensureWritesAllowed(config);
  const headers = authHeaders(config);
  const customers = getJson(config.apiBaseUrl, "/api/v1/tasks/customers", { headers });
  expectStatus(customers, 200, "task customers");

  const workers = getJson(config.apiBaseUrl, "/api/v1/workers", { headers });
  expectStatus(workers, 200, "workers");

  const customerItems = customers.json() || [];
  const workerItems = workers.json() || [];

  return {
    headers,
    customerId: customerItems[0]?.id || null,
    assigneeId: workerItems[0]?.id || null,
  };
}

export default function (data) {
  const range = isoRangeForUpcomingHour(__ITER, 30);
  const suffix = randomString(8);
  const createPayload = {
    subject: `k6 task ${__VU}-${__ITER}-${suffix}`,
    description: "Lightweight k6 write scenario",
    startAt: range.startAt,
    endAt: range.endAt,
    customerId: data.customerId,
    assigneeIds: data.assigneeId ? [data.assigneeId] : undefined,
  };

  const created = postJson(config.apiBaseUrl, "/api/v1/tasks", createPayload, {
    headers: data.headers,
  });
  expectStatus(created, [200, 201], "task create");

  const taskId = created.json("id");
  if (!taskId) {
    throw new Error(`Task create did not return an id: ${created.body}`);
  }

  const deleted = deleteRequest(config.apiBaseUrl, `/api/v1/tasks/${taskId}`, {
    headers: data.headers,
  });
  expectStatus(deleted, 200, "task delete");

  sleep(numberEnv("K6_SLEEP_SECONDS", 1));
}
