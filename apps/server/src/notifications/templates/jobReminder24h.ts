import { NotificationTemplateVars } from '../notification.types';

export function jobReminder24h(vars: NotificationTemplateVars) {
    const start = new Date(vars.startAtISO).toLocaleString('en-CA', { timeZone: vars.timezone });
    return {
        subject: `Reminder: your appointment is tomorrow at ${start}`,
        html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>${vars.companyName}</h2>
        <p>Hi ${vars.clientName ?? 'there'},</p>
        <p>This is a reminder that your appointment is <strong>in 24 hours</strong>.</p>
        <p><strong>When:</strong> ${start} (${vars.timezone})</p>
        ${vars.location ? `<p><strong>Location:</strong> ${vars.location}</p>` : ''}
        ${vars.workerName ? `<p><strong>With:</strong> ${vars.workerName}</p>` : ''}
        ${vars.manageUrl ? `<p><a href="${vars.manageUrl}">Manage or reschedule</a></p>` : ''}
        <p>See you soon!</p>
      </div>`
    };
}
