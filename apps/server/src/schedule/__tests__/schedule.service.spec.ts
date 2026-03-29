import { BadRequestException } from '@nestjs/common';
import { JobStatus, Role } from '@prisma/client';
import { ScheduleService } from '../schedule.service';

describe('ScheduleService', () => {
  const prisma = {
    $transaction: jest.fn(),
    membership: {
      findFirst: jest.fn(),
    },
  };

  const notifications = {
    scheduleJobReminders: jest.fn(),
    rescheduleJobReminders: jest.fn(),
  };

  const alerts = {
    resolveBookingReviewAlerts: jest.fn(),
  };

  const activity = {
    logJobRescheduled: jest.fn(),
  };

  const makeService = () =>
    new ScheduleService(
      prisma as any,
      notifications as any,
      alerts as any,
      activity as any,
    );

  const makeReviewJob = (overrides?: Partial<any>) => ({
    id: 'job_1',
    companyId: 'company_1',
    workerId: 'worker_1',
    client: {
      id: 'client_1',
      name: 'Owen Khan',
    },
    startAt: new Date('2026-03-27T18:00:00.000Z'),
    endAt: new Date('2026-03-27T19:00:00.000Z'),
    status: JobStatus.SCHEDULED,
    paidAt: new Date('2026-03-27T15:00:00.000Z'),
    lineItems: [
      {
        id: 'item_1',
        description: 'Window cleaning',
        serviceId: 'service_1',
        service: {
          id: 'service_1',
          durationMins: 60,
          name: 'Window cleaning',
        },
      },
    ],
    payments: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership_1',
      role: Role.ADMIN,
      userId: 'user_1',
      user: {
        name: 'Mina Manager',
        email: 'mina@example.com',
      },
    });
  });

  it('logs reschedule activity and refreshes reminders when the schedule changes', async () => {
    const service = makeService();
    const existingJob = makeReviewJob();
    const updatedJob = makeReviewJob({
      startAt: new Date('2026-03-27T20:00:00.000Z'),
      endAt: new Date('2026-03-27T21:00:00.000Z'),
    });

    const tx = {
      job: {
        findFirst: jest.fn().mockResolvedValue(existingJob),
        update: jest.fn().mockResolvedValue(updatedJob),
      },
      worker: {
        findFirst: jest.fn().mockResolvedValue({ id: 'worker_1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.reviewJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      jobId: 'job_1',
      dto: {
        start: '2026-03-27T20:00:00.000Z',
      },
    });

    expect(tx.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job_1' },
        data: expect.objectContaining({
          startAt: new Date('2026-03-27T20:00:00.000Z'),
          endAt: new Date('2026-03-27T21:00:00.000Z'),
        }),
      }),
    );
    expect(activity.logJobRescheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_1',
        clientId: 'client_1',
        actorLabel: 'Mina Manager',
      }),
    );
    expect(notifications.rescheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(result).toBe(updatedJob);
  });

  it('resolves alerts when confirming during review', async () => {
    const service = makeService();
    const pendingJob = makeReviewJob({
      status: JobStatus.PENDING_CONFIRMATION,
    });
    const confirmedJob = makeReviewJob({
      status: JobStatus.SCHEDULED,
    });

    const tx = {
      job: {
        findFirst: jest.fn().mockResolvedValue(pendingJob),
        update: jest.fn().mockResolvedValue(confirmedJob),
      },
      worker: {
        findFirst: jest.fn().mockResolvedValue({ id: 'worker_1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await service.reviewJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      jobId: 'job_1',
      dto: {
        start: '2026-03-27T20:00:00.000Z',
        confirm: true,
        alertId: 'alert_1',
      },
    });

    expect(alerts.resolveBookingReviewAlerts).toHaveBeenCalledWith({
      companyId: 'company_1',
      jobId: 'job_1',
      resolvedByUserId: 'user_1',
    });
  });

  it('rejects review requests with no actual changes', async () => {
    const service = makeService();
    const existingJob = makeReviewJob();

    const tx = {
      job: {
        findFirst: jest.fn().mockResolvedValue(existingJob),
      },
      worker: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(notifications.rescheduleJobReminders).not.toHaveBeenCalled();
  });
});
