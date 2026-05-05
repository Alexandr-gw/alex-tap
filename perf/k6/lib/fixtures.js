import { fail } from "k6";
import { getJson } from "./http.js";

export function getPublicCatalog(config) {
  const response = getJson(
    config.apiBaseUrl,
    `/api/v1/public/companies/${config.publicCompanySlug}/services`,
  );

  if (response.status !== 200) {
    fail(`Unable to load public services: ${response.status} ${response.body}`);
  }

  const payload = response.json();
  const items = payload.items || payload.services || payload;

  if (!Array.isArray(items) || items.length === 0) {
    fail("Public catalog returned no services.");
  }

  const service = items[0];
  if (!service.id || !service.slug) {
    fail("Public catalog service is missing id or slug.");
  }

  return {
    serviceId: service.id,
    serviceSlug: service.slug,
  };
}

export function getScheduleWindow(config) {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
