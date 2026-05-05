import { check, fail, group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import {
  authHeaders,
  baseConfig,
  defaultThresholds,
  ensureWritesAllowed,
  env,
  numberEnv,
} from "./lib/config.js";
import { dayString } from "./lib/dates.js";
import { loginWithPassword } from "./lib/auth.js";
import { expectStatus, getJson, patchJson, postJson } from "./lib/http.js";

const config = baseConfig();

const endpointFailures = new Counter("crud_endpoint_failures");
const clientCreateDuration = new Trend("client_create_duration", true);
const clientReadDuration = new Trend("client_read_duration", true);
const clientUpdateDuration = new Trend("client_update_duration", true);
const clientListDuration = new Trend("client_list_duration", true);
const slotReadDuration = new Trend("slot_read_duration", true);
const jobCreateDuration = new Trend("job_create_duration", true);
const jobReadDuration = new Trend("job_read_duration", true);
const jobUpdateDuration = new Trend("job_update_duration", true);
const jobListDuration = new Trend("job_list_duration", true);
const jobLifecycleDuration = new Trend("job_lifecycle_duration", true);

const metricByEndpoint = {
  client_create: clientCreateDuration,
  client_get: clientReadDuration,
  client_update: clientUpdateDuration,
  client_list: clientListDuration,
  slots_day: slotReadDuration,
  slots_range: slotReadDuration,
  job_create: jobCreateDuration,
  job_get: jobReadDuration,
  job_update: jobUpdateDuration,
  job_list: jobListDuration,
  job_cancel: jobLifecycleDuration,
  job_reopen: jobLifecycleDuration,
};

function randomString(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return output;
}

function recordEndpoint(name, response) {
  const metric = metricByEndpoint[name];
  if (metric) {
    metric.add(response.timings.duration);
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

function checkedPost(name, path, body, expected = [200, 201], params = {}) {
  const response = postJson(config.apiBaseUrl, path, body, params);
  recordEndpoint(name, response);
  expectStatus(response, expected, name);
  return response;
}

function checkedPatch(name, path, body, params = {}) {
  const response = patchJson(config.apiBaseUrl, path, body, params);
  recordEndpoint(name, response);
  expectStatus(response, 200, name);
  return response;
}

function buildHeaders() {
  if (config.authToken || config.authCookie) {
    return authHeaders(config);
  }

  const explicitUsername = env("K6_USERNAME");
  const explicitPassword = env("K6_PASSWORD");

  if (explicitUsername && explicitPassword) {
    const authCookie = loginWithPassword(config, {
      username: explicitUsername,
      password: explicitPassword,
    });

    return {
      Cookie: authCookie,
      "x-company-id": config.companyId,
    };
  }

  if (config.target !== "local") {
    fail(
      "Mutating scenario requires AUTH_TOKEN, AUTH_COOKIE, or explicit K6_USERNAME/K6_PASSWORD outside local targets.",
    );
  }

  const authCookie = loginWithPassword(config, {
    username: env("K6_USERNAME", "manager@gmail.com"),
    password: env("K6_PASSWORD", "manager"),
  });

  return {
    Cookie: authCookie,
    "x-company-id": config.companyId,
  };
}

function firstServiceItem(payload) {
  const items = payload?.items || payload?.services || payload;
  if (!Array.isArray(items) || items.length === 0) {
    fail("No services returned for CRUD setup.");
  }

  return items[0];
}

function firstWorkerItem(payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    fail("No workers returned for CRUD setup.");
  }

  return payload[0];
}

function assertContainsId(items, id, label) {
  const found = Array.isArray(items) && items.some((item) => item?.id === id);
  if (
    !check(null, {
      [`${label} contains ${id}`]: () => found,
    })
  ) {
    fail(`${label} did not include ${id}`);
  }
}

function findBookableSlot(workerId, serviceId, params) {
  for (let offset = 1; offset <= 21; offset += 1) {
    const day = dayString(offset);
    const slotsDayResponse = checkedGet(
      "slots_day",
      `/api/v1/workers/${encodeURIComponent(workerId)}/slots/day?serviceId=${encodeURIComponent(serviceId)}&day=${encodeURIComponent(day)}`,
      params,
    );
    const slots = slotsDayResponse.json("slots") || [];

    if (Array.isArray(slots) && slots.length > 0) {
      const chosen = slots[0];
      return {
        day,
        start: chosen.start,
        end: chosen.end,
      };
    }
  }

  fail(`No bookable worker slots found for worker ${workerId} and service ${serviceId}.`);
}

function nextDayString(day) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const options = {
  thresholds: {
    ...defaultThresholds(),
    http_req_failed: ["rate<0.05"],
    "crud_endpoint_failures{endpoint:client_create}": ["count==0"],
    "crud_endpoint_failures{endpoint:client_get}": ["count==0"],
    "crud_endpoint_failures{endpoint:client_update}": ["count==0"],
    "crud_endpoint_failures{endpoint:client_list}": ["count==0"],
    "crud_endpoint_failures{endpoint:slots_day}": ["count==0"],
    "crud_endpoint_failures{endpoint:slots_range}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_create}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_get}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_update}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_list}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_cancel}": ["count==0"],
    "crud_endpoint_failures{endpoint:job_reopen}": ["count==0"],
    client_create_duration: ["p(95)<1500"],
    client_read_duration: ["p(95)<1000"],
    client_update_duration: ["p(95)<1500"],
    client_list_duration: ["p(95)<1000"],
    slot_read_duration: ["p(95)<1000"],
    job_create_duration: ["p(95)<1500"],
    job_read_duration: ["p(95)<1000"],
    job_update_duration: ["p(95)<1500"],
    job_list_duration: ["p(95)<1000"],
    job_lifecycle_duration: ["p(95)<1500"],
  },
  scenarios: {
    jobs_clients_crud: {
      executor: "constant-vus",
      vus: numberEnv("K6_CRUD_VUS", 1),
      duration: env("K6_CRUD_DURATION", "30s"),
      gracefulStop: "10s",
    },
  },
};

export function setup() {
  ensureWritesAllowed(config);
  const headers = buildHeaders();

  const servicesResponse = checkedGet(
    "services_setup",
    "/api/v1/services?page=1&pageSize=20&active=true",
    { headers },
  );
  const workersResponse = checkedGet("workers_setup", "/api/v1/workers", { headers });

  const service = firstServiceItem(servicesResponse.json());
  const worker = firstWorkerItem(workersResponse.json());

  if (!service?.id) {
    fail("Setup service is missing id.");
  }

  if (!worker?.id) {
    fail("Setup worker is missing id.");
  }

  return {
    headers,
    serviceId: service.id,
    serviceName: service.name || "k6 service",
    workerId: worker.id,
  };
}

export default function (data) {
  const params = { headers: data.headers };
  const suffix = `${__VU}-${__ITER}-${randomString(6)}`;
  const clientEmail = `k6-client-${suffix}@example.test`;

  let clientId = null;
  let jobId = null;

  group("clients_crud", () => {
    const createClientResponse = checkedPost(
      "client_create",
      "/api/v1/clients",
      {
        name: `K6 Client ${suffix}`,
        email: clientEmail,
        phone: `780555${String(1000 + __ITER).slice(-4)}`,
        address: `${100 + __ITER} K6 Avenue, Edmonton, AB`,
        internalNotes: `Created by k6 iteration ${__ITER}`,
      },
      [201],
      params,
    );

    clientId = createClientResponse.json("id");
    if (!clientId) {
      fail(`Client create did not return an id: ${createClientResponse.body}`);
    }

    const getClientResponse = checkedGet("client_get", `/api/v1/clients/${clientId}`, params);
    check(getClientResponse, {
      "client get returns created client id": (res) => res.json("id") === clientId,
      "client get preserves created email": (res) => res.json("email") === clientEmail,
    });

    const updatedName = `K6 Client Updated ${suffix}`;
    const updateClientResponse = checkedPatch(
      "client_update",
      `/api/v1/clients/${clientId}`,
      {
        name: updatedName,
        internalNotes: `Updated by k6 iteration ${__ITER}`,
      },
      params,
    );
    check(updateClientResponse, {
      "client update changes name": (res) => res.json("name") === updatedName,
    });

    const listClientResponse = checkedGet(
      "client_list",
      `/api/v1/clients?search=${encodeURIComponent(clientEmail)}&take=10`,
      params,
    );
    assertContainsId(listClientResponse.json("items"), clientId, "client list");
  });

  group("slots_and_jobs_crud", () => {
    const bookableSlot = findBookableSlot(data.workerId, data.serviceId, params);
    checkedGet(
      "slots_range",
      `/api/v1/workers/${encodeURIComponent(data.workerId)}/slots?serviceId=${encodeURIComponent(data.serviceId)}&from=${encodeURIComponent(`${bookableSlot.day}T00:00:00.000Z`)}&to=${encodeURIComponent(`${nextDayString(bookableSlot.day)}T00:00:00.000Z`)}`,
      params,
    );

    const createJobResponse = checkedPost(
      "job_create",
      "/api/v1/jobs",
      {
        companyId: config.companyId,
        title: `K6 Job ${suffix}`,
        description: "CRUD coverage scenario created by k6",
        workerId: data.workerId,
        workerIds: [data.workerId],
        clientId,
        start: bookableSlot.start,
        end: bookableSlot.end,
        lineItems: [
          {
            name: data.serviceName,
            quantity: 1,
            unitPriceCents: 5000,
          },
        ],
      },
      [201],
      params,
    );

    jobId = createJobResponse.json("id");
    if (!jobId) {
      fail(`Job create did not return an id: ${createJobResponse.body}`);
    }

    const getJobResponse = checkedGet("job_get", `/api/v1/jobs/${jobId}`, params);
    check(getJobResponse, {
      "job get returns created job id": (res) => res.json("id") === jobId,
      "job get references created client": (res) => res.json("client.id") === clientId,
    });

    const updatedTitle = `K6 Job Updated ${suffix}`;
    const updateJobResponse = checkedPatch(
      "job_update",
      `/api/v1/jobs/${jobId}`,
      {
        title: updatedTitle,
        description: "Updated by k6 CRUD scenario",
      },
      params,
    );
    check(updateJobResponse, {
      "job update changes title": (res) => res.json("title") === updatedTitle,
    });

    const listJobResponse = checkedGet(
      "job_list",
      `/api/v1/jobs?from=${encodeURIComponent(bookableSlot.start)}&to=${encodeURIComponent(bookableSlot.end)}&take=100`,
      params,
    );
    assertContainsId(listJobResponse.json("items"), jobId, "job list");

    const cancelJobResponse = checkedPost(
      "job_cancel",
      `/api/v1/jobs/${jobId}/cancel`,
      {},
      [200, 201],
      params,
    );
    check(cancelJobResponse, {
      "job cancel transitions to canceled": (res) => res.json("status") === "CANCELED",
    });

    const reopenJobResponse = checkedPost(
      "job_reopen",
      `/api/v1/jobs/${jobId}/reopen`,
      {},
      [200, 201],
      params,
    );
    check(reopenJobResponse, {
      "job reopen leaves job active": (res) => res.json("status") !== "CANCELED",
    });
  });

  sleep(numberEnv("K6_SLEEP_SECONDS", 1));
}
