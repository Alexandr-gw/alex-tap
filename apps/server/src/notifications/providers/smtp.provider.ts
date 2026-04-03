import { Injectable } from '@nestjs/common';
import { createTransport, type SendMailOptions, type Transporter } from 'nodemailer';
import { EmailProvider } from './email.provider';
import { SendEmailInput, ProviderResult } from '../notification.types';

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function buildTransporter(): Transporter {
  const host = process.env.SMTP_HOST?.trim() || '127.0.0.1';
  const port = Number(process.env.SMTP_PORT?.trim() || '1025');
  const secure = parseBoolean(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: pass ?? '' } : undefined,
  });
}

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter = buildTransporter();

  async sendEmail(input: SendEmailInput): Promise<ProviderResult> {
    try {
      const message = await this.transporter.sendMail(this.buildMessage(input));
      return { ok: true, messageId: message.messageId };
    } catch (error: any) {
      return {
        ok: false,
        errorMessage: error?.message ?? 'Unable to send SMTP email',
      };
    }
  }

  private buildMessage(input: SendEmailInput): SendMailOptions {
    return {
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    };
  }
}

