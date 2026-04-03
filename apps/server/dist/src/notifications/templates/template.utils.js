"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.formatNotificationDate = formatNotificationDate;
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function formatNotificationDate(startAtISO, timezone) {
    return new Date(startAtISO).toLocaleString('en-CA', { timeZone: timezone });
}
//# sourceMappingURL=template.utils.js.map