import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Role } from '@prisma/client';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { ScheduleService } from '../schedule.service';

describe('ScheduleService', () => {
  const prisma = {
    $transaction: jest.fn(),
    service: {
      findUnique: jest.fn(),
    },
    worker: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    job: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
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

  it('creates a scheduled job, stores idempotency metadata, and schedules reminders', async () => {
    const service = makeService();

    prisma.service.findUnique.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });
    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_1' });

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'client_1' }),
      },
      job: {
        create: jest.fn().mockResolvedValue({ id: 'job_1' }),
      },
      jobLineItem: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any, options: any) => {
      expect(options).toEqual({ isolationLevel: 'Serializable' });
      return callback(tx);
    });

    const result = await service.createScheduledJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      idempotencyKey: 'idem_1',
      dto: {
        serviceId: 'service_1',
        workerId: 'worker_1',
        start: '2026-03-27T18:00:00.000Z',
        client: {
          name: 'Owen Khan',
          email: 'owen@example.com',
          phone: '555-1234',
        },
      } as any,
    });

    expect(tx.job.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        clientId: 'client_1',
        workerId: 'worker_1',
        startAt: new Date('2026-03-27T18:00:00.000Z'),
        endAt: new Date('2026-03-27T19:00:00.000Z'),
        status: JobStatus.SCHEDULED,
        subtotalCents: 12500,
        taxCents: 0,
        totalCents: 12500,
        paidCents: 0,
        balanceCents: 12500,
        currency: 'CAD',
      },
    });
    expect(tx.jobLineItem.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job_1',
        serviceId: 'service_1',
        description: 'Window cleaning',
        quantity: 1,
        unitPriceCents: 12500,
        taxRateBps: 0,
        totalCents: 12500,
      },
    });
    expect(tx.idempotencyKey.update).toHaveBeenCalledWith({
      where: { key: 'idem_1' },
      data: { jobId: 'job_1' },
    });
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(result).toEqual({ id: 'job_1' });
  });

  it('returns an existing scheduled job when the idempotency key already resolves to one', async () => {
    const service = makeService();
    const requestHash = hashRequestBody({
      serviceId: 'service_1',
      start: '2026-03-27T18:00:00.000Z',
      client: {
        name: 'Owen Khan',
        email: 'owen@example.com',
      },
      companyId: 'company_1',
      workerId: null,
      end: '2026-03-27T19:00:00.000Z',
    });

    prisma.service.findUnique.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash,
          jobId: 'job_existing',
        }),
      },
      job: {
        findUnique: jest.fn().mockResolvedValue({ id: 'job_existing' }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const result = await service.createScheduledJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      idempotencyKey: 'idem_existing',
      dto: {
        serviceId: 'service_1',
        start: '2026-03-27T18:00:00.000Z',
        client: {
          name: 'Owen Khan',
          email: 'owen@example.com',
        },
      } as any,
    });

    expect(result).toEqual({ id: 'job_existing' });
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_existing',
    );
  });

  it('validates scheduled job inputs for service, worker, and client requirements', async () => {
    const service = makeService();

    await expect(
      service.createScheduledJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          start: 'bad-date',
          client: { name: 'Owen Khan' },
        } as any,
      }),
    ).rejects.toThrow('Invalid start');

    prisma.service.findUnique.mockResolvedValue(null);
    await expect(
      service.createScheduledJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          start: '2026-03-27T18:00:00.000Z',
          client: { name: 'Owen Khan' },
        } as any,
      }),
    ).rejects.toThrow('Invalid service');

    prisma.service.findUnique.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });
    prisma.worker.findFirst.mockResolvedValue(null);
    await expect(
      service.createScheduledJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          workerId: 'worker_1',
          start: '2026-03-27T18:00:00.000Z',
          client: { name: 'Owen Khan' },
        } as any,
      }),
    ).rejects.toThrow('Invalid worker');

    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_1' });
    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      service.createScheduledJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          start: '2026-03-27T18:00:00.000Z',
          client: {},
        } as any,
      }),
    ).rejects.toThrow('Client name is required (or provide clientId)');
  });

  it('lists company workers for managers and confirms jobs directly', async () => {
    const service = makeService();

    prisma.worker.findMany.mockResolvedValue([{ id: 'worker_1', displayName: 'Lena' }]);
    prisma.job.update.mockResolvedValue({ id: 'job_1', status: JobStatus.SCHEDULED });

    await expect(
      service.listCompanyWorkers({
        companyId: 'company_1',
        userSub: 'sub_1',
      }),
    ).resolves.toEqual([{ id: 'worker_1', displayName: 'Lena' }]);

    await expect(
      service.confirmJob('company_1', 'job_1', 'user_1'),
    ).resolves.toEqual({ id: 'job_1', status: JobStatus.SCHEDULED });

    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(alerts.resolveBookingReviewAlerts).toHaveBeenCalledWith({
      companyId: 'company_1',
      jobId: 'job_1',
      resolvedByUserId: 'user_1',
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
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(existingJob)
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue(updatedJob),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
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
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(pendingJob)
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue(confirmedJob),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
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
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(existingJob)
          .mockResolvedValueOnce(null),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
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

  it('validates review input for bad dates, unpaid confirmations, and conflicting schedules', async () => {
    const service = makeService();

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: { start: 'bad-date' },
      }),
    ).rejects.toThrow('Invalid start');

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: { end: 'bad-date' },
      }),
    ).rejects.toThrow('Invalid end');

    const unpaidPendingJob = makeReviewJob({
      status: JobStatus.PENDING_CONFIRMATION,
      paidAt: null,
    });
    const tx = {
      job: {
        findFirst: jest.fn().mockResolvedValue(unpaidPendingJob),
      },
      worker: {
        findFirst: jest.fn(),
      },
      jobAssignment: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: { confirm: true, start: '2026-03-27T20:00:00.000Z' },
      }),
    ).rejects.toThrow('Job must be paid before confirmation');

    const conflictTx = {
      job: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(makeReviewJob())
          .mockResolvedValueOnce({ id: 'job_conflict' }),
      },
      worker: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ id: 'worker_1' }]),
      },
      jobAssignment: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(conflictTx));

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: {
          workerId: 'worker_1',
          start: '2026-03-27T20:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('covers manager access and worker helper branches', async () => {
    const service = makeService();

    await expect(
      (service as any).requireManagerActor('company_1', null),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.membership.findFirst.mockResolvedValueOnce(null);
    await expect(
      (service as any).requireManagerActor('company_1', 'sub_1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.membership.findFirst.mockResolvedValueOnce({
      id: 'membership_1',
      role: Role.WORKER,
      userId: 'user_1',
      user: {
        name: 'Worker User',
        email: 'worker@example.com',
      },
    });
    await expect(
      (service as any).requireManagerActor('company_1', 'sub_1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      (service as any).getAssignedWorkerIds({
        workerId: 'worker_1',
        assignments: [{ workerId: 'worker_1' }, { worker: { id: 'worker_2' } }],
      }),
    ).toEqual(['worker_1', 'worker_2']);

    expect((service as any).areStringArraysEqual(['a'], ['b'])).toBe(false);
    expect((service as any).areStringArraysEqual(['a'], ['a'])).toBe(true);

    prisma.worker.findMany.mockResolvedValue([]);
    await expect(
      (service as any).resolveNextWorkerIds(prisma, 'company_1', ['worker_1'], undefined),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.worker.findMany.mockResolvedValue([{ id: 'worker_1' }]);
    await expect(
      (service as any).resolveNextWorkerIds(prisma, 'company_1', undefined, 'worker_1'),
    ).resolves.toEqual(['worker_1']);

    const syncTx = {
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
    };
    await (service as any).syncJobAssignments(syncTx, 'job_1', []);
    expect(syncTx.jobAssignment.deleteMany).toHaveBeenCalledWith({
      where: { jobId: 'job_1' },
    });
    expect(syncTx.jobAssignment.createMany).not.toHaveBeenCalled();
  });
});
