"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobReminder1h = jobReminder1h;
const template_utils_1 = require("./template.utils");
function jobReminder1h(vars) {
    const start = (0, template_utils_1.formatNotificationDate)(vars.startAtISO, vars.timezone);
    const clientName = (0, template_utils_1.escapeHtml)(vars.clientName ?? 'there');
    const companyName = (0, template_utils_1.escapeHtml)(vars.companyName);
    const timezone = (0, template_utils_1.escapeHtml)(vars.timezone);
    const location = vars.location ? (0, template_utils_1.escapeHtml)(vars.location) : null;
    const workerName = vars.workerName ? (0, template_utils_1.escapeHtml)(vars.workerName) : null;
    const manageUrl = vars.manageUrl ? (0, template_utils_1.escapeHtml)(vars.manageUrl) : null;
    return {
        subject: `Reminder: your appointment is in 1 hour (${start})`,
        html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>${companyName}</h2>
        <p>Hi ${clientName},</p>
        <p>Your appointment starts in <strong>1 hour</strong>.</p>
        <p><strong>When:</strong> ${(0, template_utils_1.escapeHtml)(start)} (${timezone})</p>
        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
        ${workerName ? `<p><strong>With:</strong> ${workerName}</p>` : ''}
        ${manageUrl ? `<p><a href="${manageUrl}">Manage or reschedule</a></p>` : ''}
        <p>See you soon!</p>
      </div>`,
    };
}
//# sourceMappingURL=jobReminder1h.js.map