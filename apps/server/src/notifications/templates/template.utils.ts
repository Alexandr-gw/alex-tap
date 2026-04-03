export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatNotificationDate(startAtISO: string, timezone: string) {
  return new Date(startAtISO).toLocaleString('en-CA', { timeZone: timezone });
}
