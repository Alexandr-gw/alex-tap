import { NotificationTemplateVars } from '../notification.types';
import { escapeHtml } from './template.utils';

export function jobConfirmation(vars: NotificationTemplateVars) {
  const scheduledFor = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: vars.timezone,
  }).format(new Date(vars.startAtISO));

  const clientName = vars.clientName?.trim() || 'there';
  const serviceName = vars.serviceName?.trim() || 'your upcoming job';
  const location = vars.location?.trim() || 'the address on file';
  const workerName = vars.workerName?.trim() || 'our team';

  return {
    subject: `${vars.companyName}: your appointment is confirmed`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Hi ${escapeHtml(clientName)},</p>
        <p>Your appointment for ${escapeHtml(serviceName)} is confirmed.</p>
        <p><strong>When:</strong> ${escapeHtml(scheduledFor)}</p>
        <p><strong>Where:</strong> ${escapeHtml(location)}</p>
        <p><strong>Assigned team:</strong> ${escapeHtml(workerName)}</p>
        <p>If anything changes, please reply to this email and ${escapeHtml(vars.companyName)} will help.</p>
        <p>Thanks,<br />${escapeHtml(vars.companyName)}</p>
      </div>
    `,
  };
}
