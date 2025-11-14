import { Injectable } from '@nestjs/common';
import { PrismaClient, NotificationChannel, NotificationStatus } from '@prisma/client';
import { emailQueue } from './workers/email.worker';
import { smsQueue } from './workers/sms.worker';
import {
    TYPE_JOB_REMINDER_24H,
    TYPE_JOB_REMINDER_2H,
    MAX_ATTEMPTS,
} from './notification.constants';

const prisma = new PrismaClient();

function bullBackoff(attempt: number) {
    // simple exponential: 5s, 30s, 2m, 10m, 30m
    const waits = [5_000, 30_000, 120_000, 600_000, 1_800_000];
    return waits[Math.min(attempt - 1, waits.length - 1)];
}

@Injectable()
export class NotificationService {
    /**
     * Enqueue T-24h & T-2h reminders for a job (email + sms based on feature flags).
     */
    async enqueueJobReminders(companyId: string, jobId: string) {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                company: true,
                client: true,
                worker: true,
            },
        });
        if (!job) throw new Error('job not found');

        // Compute schedule times in UTC by company timezone (approx: we rely on job.startAt already UTC)
        const t24 = new Date(job.startAt.getTime() - 24 * 60 * 60 * 1000);
        const t2  = new Date(job.startAt.getTime() -  2 * 60 * 60 * 1000);

        const emailEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
        const smsEnabled   = process.env.NOTIFICATIONS_SMS_ENABLED === 'true';

        // Common payload (avoid PII; include ids only)
        const basePayload = {
            jobId: job.id,
            clientId: job.clientId,
            workerId: job.workerId ?? null,
            manageUrl: null as string | null, // add later if you have a portal link
        };

        // Helper to create+enqueue one notification
        const createAndEnqueue = async (
            type: '24h' | '2h',
            channel: NotificationChannel,
            scheduledAt: Date
        ) => {
            const notifType = type === '24h' ? TYPE_JOB_REMINDER_24H : TYPE_JOB_REMINDER_2H;

            // Dedupe: do we already have a queued notification for same tuple?
            const existing = await prisma.notification.findFirst({
                where: {
                    companyId,
                    type: notifType,
                    channel,
                    targetType: 'JOB',
                    targetId: job.id,
                    status: 'QUEUED',
                    scheduledAt,
                },
            });
            if (existing) return existing;

            const notification = await prisma.notification.create({
                data: {
                    companyId,
                    type: notifType,
                    channel,
                    status: 'QUEUED',
                    targetType: 'JOB',
                    targetId: job.id,
                    payload: basePayload,
                    scheduledAt,
                },
            });

            // Use BullMQ jobId to dedupe at queue level too
            const jobIdKey = `job:${job.id}:${channel.toLowerCase()}:${type}`;

            const opts = {
                jobId: jobIdKey,
                delay: Math.max(0, scheduledAt.getTime() - Date.now()),
                attempts: MAX_ATTEMPTS,
                backoff: {
                    type: 'exponential',
                    delay: 5_000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            } as const;

            if (channel === 'EMAIL') {
                await emailQueue.add('send', { companyId, notificationId: notification.id }, opts);
            } else if (channel === 'SMS') {
                await smsQueue.add('send', { companyId, notificationId: notification.id }, opts);
            }

            return notification;
        };

        const promises: Promise<any>[] = [];
        if (emailEnabled && job.client.email) {
            promises.push(createAndEnqueue('24h', 'EMAIL', t24));
            promises.push(createAndEnqueue('2h', 'EMAIL', t2));
        }
        if (smsEnabled && job.client.phone) {
            promises.push(createAndEnqueue('24h', 'SMS', t24));
            promises.push(createAndEnqueue('2h', 'SMS', t2));
        }

        await Promise.all(promises);
    }
}
