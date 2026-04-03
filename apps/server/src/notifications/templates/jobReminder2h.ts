import { NotificationTemplateVars } from '../notification.types';
import { escapeHtml, formatNotificationDate } from './template.utils';

export function jobReminder2h(vars: NotificationTemplateVars) {
    const start = formatNotificationDate(vars.startAtISO, vars.timezone);
    const clientName = escapeHtml(vars.clientName ?? 'there');
    const companyName = escapeHtml(vars.companyName);
    const timezone = escapeHtml(vars.timezone);
    const location = vars.location ? escapeHtml(vars.location) : null;
    const workerName = vars.workerName ? escapeHtml(vars.workerName) : null;
    const manageUrl = vars.manageUrl ? escapeHtml(vars.manageUrl) : null;
    return {
        subject: `Reminder: your appointment in 2 hours (${start})`,
        html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>${companyName}</h2>
        <p>Hi ${clientName},</p>
        <p>Your appointment starts in <strong>2 hours</strong>.</p>
        <p><strong>When:</strong> ${escapeHtml(start)} (${timezone})</p>
        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
        ${workerName ? `<p><strong>With:</strong> ${workerName}</p>` : ''}
        ${manageUrl ? `<p><a href="${manageUrl}">Manage or reschedule</a></p>` : ''}
        <p>Safe travels!</p>
      </div>`
    };
}
