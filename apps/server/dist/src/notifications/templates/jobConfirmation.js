"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobConfirmation = jobConfirmation;
const template_utils_1 = require("./template.utils");
function jobConfirmation(vars) {
    const scheduledFor = new Intl.DateTimeFormat('en-CA', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: vars.timezone,
    }).format(new Date(vars.startAtISO));
    const clientName = vars.clientName?.trim() || 'there';
    const serviceName = vars.serviceName?.trim() || 'your upcoming job';
    const location = vars.location?.trim() || 'the address on file';
    const workerName = vars.workerName?.trim() || 'our team';
    const manageUrl = vars.manageUrl ? (0, template_utils_1.escapeHtml)(vars.manageUrl) : null;
    return {
        subject: `${vars.companyName}: your appointment is confirmed`,
        html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Hi ${(0, template_utils_1.escapeHtml)(clientName)},</p>
        <p>Your appointment for ${(0, template_utils_1.escapeHtml)(serviceName)} is confirmed.</p>
        <p><strong>When:</strong> ${(0, template_utils_1.escapeHtml)(scheduledFor)}</p>
        <p><strong>Where:</strong> ${(0, template_utils_1.escapeHtml)(location)}</p>
        <p><strong>Assigned team:</strong> ${(0, template_utils_1.escapeHtml)(workerName)}</p>
        ${manageUrl ? `<p><a href="${manageUrl}">View your booking details</a></p>` : ''}
        <p>If anything changes, please reply to this email and ${(0, template_utils_1.escapeHtml)(vars.companyName)} will help.</p>
        <p>Thanks,<br />${(0, template_utils_1.escapeHtml)(vars.companyName)}</p>
      </div>
    `,
    };
}
//# sourceMappingURL=jobConfirmation.js.map