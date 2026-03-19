"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobReminder1h = jobReminder1h;
function jobReminder1h(vars) {
    const start = new Date(vars.startAtISO).toLocaleString('en-CA', {
        timeZone: vars.timezone,
    });
    return {
        subject: `Reminder: your appointment is in 1 hour (${start})`,
        html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>${vars.companyName}</h2>
        <p>Hi ${vars.clientName ?? 'there'},</p>
        <p>Your appointment starts in <strong>1 hour</strong>.</p>
        <p><strong>When:</strong> ${start} (${vars.timezone})</p>
        ${vars.location ? `<p><strong>Location:</strong> ${vars.location}</p>` : ''}
        ${vars.workerName ? `<p><strong>With:</strong> ${vars.workerName}</p>` : ''}
        ${vars.manageUrl ? `<p><a href="${vars.manageUrl}">Manage or reschedule</a></p>` : ''}
        <p>See you soon!</p>
      </div>`,
    };
}
//# sourceMappingURL=jobReminder1h.js.map