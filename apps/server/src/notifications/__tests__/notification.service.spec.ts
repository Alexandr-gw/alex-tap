import {
  JobStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
} from '@prisma/client';
import { NotificationService } from '../notification.service';
import {
  TYPE_JOB_REMINDER_1H,
  TYPE_JOB_REMINDER_24H,
} from '../notification.constants';

describe('NotificationService', () => {
  const originalEmailEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED;
  const originalAppPublicUrl = process.env.APP_PUBLIC_URL;

  const prisma = {
    job: { findFirst: jest.fn() },
    notification: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },

  };

  const queues = {
    scheduleEmailReminder: jest.fn(),
    cancelEmailReminder: jest.fn(),
  };

  const emailProvider = {
    sendEmail: jest.fn(),
  };

  const bookingAccess = {
    getJobAccessUrl: jest.fn(),
  };

  const makeService = () =>
    new NotificationService(
      prisma as any,
      queues as any,
      emailProvider as any,
      bookingAccess as any,
    );

  const makeJob = (overrides?: Partial<any>) => ({
    id: 'job_1',
    companyId: 'company_1',
    clientId: 'client_1',
    workerId: 'worker_1',
    title: 'Window cleaning',
    startAt: new Date(Date.now() + 30 * 60 * 60 * 1000),
    status: JobStatus.SCHEDULED,
    company: { name: 'Alex Tap', timezone: 'America/Edmonton' },
    client: {
      id: 'client_1',
      name: 'Owen Khan',
      email: 'owen@example.com',
      address: '123 Main St',
    },
    worker: { displayName: 'Lena' },
    ...overrides,
  });

  const makeNotification = (overrides?: Partial<any>) => ({
    id: 'notif_1',
    type: TYPE_JOB_REMINDER_24H,
    channel: NotificationChannel.EMAIL,
    status: NotificationStatus.QUEUED,
    targetType: NotificationTargetType.JOB,
    targetId: 'job_1',
    scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    sentAt: null,
    recipient: 'owen@example.com',
    providerMessageId: null,
    error: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.NOTIFICATIONS_EMAIL_ENABLED = 'true';
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';

    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    bookingAccess.getJobAccessUrl.mockResolvedValue('http://localhost:3000/booking/booking-token');
    queues.cancelEmailReminder.mockResolvedValue(undefined);
    queues.scheduleEmailReminder.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = originalEmailEnabled;
    process.env.APP_PUBLIC_URL = originalAppPublicUrl;
  });

  it('schedules both 24h and 1h reminders for eligible jobs', async () => {
    const job = makeJob();
    const scheduled24h = new Date(job.startAt.getTime() - 24 * 60 * 60 * 1000);
    const scheduled1h = new Date(job.startAt.getTime() - 60 * 60 * 1000);

    prisma.job.findFirst.mockResolvedValue(job);
    prisma.notification.create
      .mockResolvedValueOnce(
        makeNotification({
          id: 'notif_24h',
          type: TYPE_JOB_REMINDER_24H,
          scheduledAt: scheduled24h,
        }),
      )
      .mockResolvedValueOnce(
        makeNotification({
          id: 'notif_1h',
          type: TYPE_JOB_REMINDER_1H,
          scheduledAt: scheduled1h,
        }),
      );

    const service = makeService();
    const notifications = await service.scheduleJobReminders(
      'company_1',
      'job_1',
    );

    expect(queues.cancelEmailReminder).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(queues.scheduleEmailReminder).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        jobId: 'job_1',
        reminderKey: '24h',
        companyId: 'company_1',
        notificationId: 'notif_24h',
      }),
    );
    expect(queues.scheduleEmailReminder).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        jobId: 'job_1',
        reminderKey: '1h',
        companyId: 'company_1',
        notificationId: 'notif_1h',
      }),
    );
    expect(notifications.map((item) => item.type)).toEqual([
      TYPE_JOB_REMINDER_24H,
      TYPE_JOB_REMINDER_1H,
    ]);
  });

  it('returns blocked summary when the client email is missing', async () => {
    prisma.job.findFirst.mockResolvedValue(
      makeJob({
        client: {
          id: 'client_1',
          name: 'Owen Khan',
          email: null,
          address: '123 Main St',
        },
      }),
    );
    prisma.notification.findMany.mockResolvedValue([]);

    const service = makeService();
    const summary = await service.getJobNotificationsSummary(
      'company_1',
      'job_1',
    );

    expect(summary.clientEmail).toBeNull();
    expect(summary.blockedReason).toContain('No client email');
    expect(summary.reminders).toEqual([
      expect.objectContaining({
        type: 'REMINDER_24H',
        status: 'NOT_APPLICABLE',
      }),
      expect.objectContaining({
        type: 'REMINDER_1H',
        status: 'NOT_APPLICABLE',
      }),
    ]);
  });
});




