import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JobStatus, Role } from '@prisma/client';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { JobsService } from '../jobs.service';

describe('JobsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    company: {
      findUnique: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    worker: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
  };

  const slots = {
    isSlotBookable: jest.fn(),
  };

  const schedule = {
    listCompanyWorkers: jest.fn(),
    reviewJob: jest.fn(),
    confirmJob: jest.fn(),
  };

  const payments = {
    createCheckoutSession: jest.fn(),
  };

  const notifications = {
    cancelJobReminders: jest.fn(),
    scheduleJobReminders: jest.fn(),
    getJobNotificationsSummary: jest.fn(),
    sendJobConfirmation: jest.fn(),
  };

  const activity = {
    logJobCompleted: jest.fn(),
    logJobCanceled: jest.fn(),
    logJobCreated: jest.fn(),
    listJobActivity: jest.fn(),
  };

  const makeService = () =>
    new JobsService(
      prisma as any,
      slots as any,
      schedule as any,
      payments as any,
      notifications as any,
      activity as any,
    );

  const makeListJob = (overrides?: Partial<any>) => ({
    id: 'job_1',
    workerId: 'worker_1',
    title: 'Window cleaning',
    status: JobStatus.SCHEDULED,
    startAt: new Date('2026-03-27T18:00:00.000Z'),
    endAt: new Date('2026-03-27T19:00:00.000Z'),
    location: '123 Main St',
    totalCents: 10000,
    currency: 'CAD',
    client: {
      id: 'client_1',
      name: 'Owen Khan',
      email: 'owen@example.com',
      phone: '555-1234',
      address: '123 Main St',
    },
    worker: {
      id: 'worker_1',
      displayName: 'Lena',
      colorTag: '#22c55e',
      phone: '555-0000',
    },
    assignments: [],
    lineItems: [
      {
        id: 'item_1',
        description: 'Window cleaning',
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
        service: null,
      },
    ],
    ...overrides,
  });

  const makeDetailedJob = (overrides?: Partial<any>) => ({
    id: 'job_1',
    workerId: 'worker_1',
    title: 'Window cleaning',
    description: null,
    internalNotes: null,
    status: JobStatus.SCHEDULED,
    startAt: new Date('2026-03-27T18:00:00.000Z'),
    endAt: new Date('2026-03-27T19:00:00.000Z'),
    location: '123 Main St',
    subtotalCents: 10000,
    taxCents: 0,
    totalCents: 10000,
    paidCents: 0,
    balanceCents: 10000,
    currency: 'CAD',
    paidAt: null,
    createdAt: new Date('2026-03-27T16:00:00.000Z'),
    updatedAt: new Date('2026-03-27T16:00:00.000Z'),
    client: {
      id: 'client_1',
      name: 'Owen Khan',
      email: 'owen@example.com',
      phone: '555-1234',
      address: '123 Main St',
      notes: null,
    },
    worker: {
      id: 'worker_1',
      displayName: 'Lena',
      colorTag: '#22c55e',
      phone: '555-0000',
    },
    assignments: [],
    lineItems: [
      {
        id: 'item_1',
        description: 'Window cleaning',
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
        service: null,
      },
    ],
    comments: [],
    payments: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      name: 'Mina Manager',
      email: 'mina@example.com',
    });
    prisma.membership.findFirst.mockResolvedValue({ role: Role.MANAGER });
    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_1' });
    prisma.job.findFirst.mockResolvedValue(makeDetailedJob());
    prisma.auditLog.create.mockResolvedValue(undefined);
  });

  it('lists jobs for managers with filters, cursor pagination, and worker fallback mapping', async () => {
    const service = makeService();

    prisma.company.findUnique.mockResolvedValue({ timezone: 'America/Edmonton' });
    prisma.job.findMany.mockResolvedValue([
      makeListJob({
        id: 'job_1',
        workerId: null,
        title: null,
        location: null,
        worker: null,
        assignments: [
          {
            worker: {
              id: 'worker_2',
              displayName: 'Gus',
              colorTag: '#3b82f6',
              phone: '555-2222',
            },
          },
        ],
        lineItems: [
          {
            id: 'item_2',
            description: 'Deep clean',
            quantity: 1,
            unitPriceCents: 12000,
            totalCents: 12000,
            service: null,
          },
        ],
      }),
      makeListJob({ id: 'job_2' }),
    ]);

    const result = await service.findManyForUser({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      dto: {
        status: JobStatus.SCHEDULED,
        from: '2026-03-27T00:00:00.000Z',
        to: '2026-03-28T00:00:00.000Z',
        workerId: 'worker_2',
        clientEmail: 'owen@example.com',
        take: 1,
      } as any,
    });

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company_1',
          status: JobStatus.SCHEDULED,
          client: { email: 'owen@example.com' },
          AND: expect.arrayContaining([
            { startAt: { lt: new Date('2026-03-28T00:00:00.000Z') } },
            { endAt: { gt: new Date('2026-03-27T00:00:00.000Z') } },
            {
              OR: [
                { workerId: 'worker_2' },
                { assignments: { some: { workerId: 'worker_2' } } },
              ],
            },
          ]),
        }),
        take: 2,
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 'job_1',
          workerId: null,
          workerIds: ['worker_2'],
          startAt: '2026-03-27T18:00:00.000Z',
          endAt: '2026-03-27T19:00:00.000Z',
          status: JobStatus.SCHEDULED,
          location: '123 Main St',
          clientName: 'Owen Khan',
          clientEmail: 'owen@example.com',
          totalCents: 10000,
          currency: 'CAD',
          serviceName: 'Deep clean',
          workerName: 'Gus',
          colorTag: '#3b82f6',
        },
      ],
      nextCursor: 'job_1',
      timezone: 'America/Edmonton',
    });
  });

  it('returns no jobs when a worker has no active worker scope', async () => {
    const service = makeService();
    prisma.worker.findFirst.mockResolvedValue(null);

    const result = await service.findManyForUser({
      companyId: 'company_1',
      roles: ['worker'],
      userSub: 'sub_1',
      dto: {} as any,
    });

    expect(result).toEqual({ items: [], nextCursor: null, timezone: null });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('returns no jobs for client users without a client email filter', async () => {
    const service = makeService();

    const result = await service.findManyForUser({
      companyId: 'company_1',
      roles: ['client'],
      userSub: 'sub_1',
      dto: {} as any,
    });

    expect(result).toEqual({ items: [], nextCursor: null, timezone: null });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('rejects listing jobs for unsupported roles', async () => {
    const service = makeService();

    await expect(
      service.findManyForUser({
        companyId: 'company_1',
        roles: ['guest'],
        userSub: 'sub_1',
        dto: {} as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps a detailed job response with deduped workers, comments, and payments', async () => {
    const service = makeService();
    const job = makeDetailedJob({
      id: 'job_123456',
      title: null,
      status: JobStatus.DONE,
      assignments: [
        {
          workerId: 'worker_1',
          worker: {
            id: 'worker_1',
            displayName: 'Lena',
            colorTag: '#22c55e',
            phone: '555-0000',
          },
        },
        {
          workerId: 'worker_2',
          worker: {
            id: 'worker_2',
            displayName: 'Gus',
            colorTag: '#3b82f6',
            phone: '555-2222',
          },
        },
      ],
      comments: [
        {
          id: 'comment_1',
          message: 'Customer confirmed the gate code',
          author: {
            id: 'user_1',
            name: null,
            email: 'manager@example.com',
          },
          createdAt: new Date('2026-03-27T16:30:00.000Z'),
        },
      ],
      payments: [
        {
          id: 'payment_1',
          status: 'SUCCEEDED',
          amountCents: 10000,
          currency: 'CAD',
          createdAt: new Date('2026-03-27T16:45:00.000Z'),
          receiptUrl: 'https://example.com/receipt',
          stripeSessionId: 'cs_123',
        },
      ],
    });

    prisma.job.findFirst.mockResolvedValue(job);

    const result = await service.findOneForUser({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      id: 'job_123456',
    });

    expect(result.jobNumber).toBe('JOB-123456');
    expect(result.completed).toBe(true);
    expect(result.title).toBe('Window cleaning');
    expect(result.workers).toEqual([
      { id: 'worker_1', name: 'Lena' },
      { id: 'worker_2', name: 'Gus' },
    ]);
    expect(result.visits[0]).toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        completed: true,
      }),
    );
    expect(result.comments[0]).toEqual({
      id: 'comment_1',
      body: 'Customer confirmed the gate code',
      authorName: 'manager@example.com',
      createdAt: '2026-03-27T16:30:00.000Z',
    });
    expect(result.payments[0]).toEqual({
      id: 'payment_1',
      status: 'SUCCEEDED',
      amountCents: 10000,
      currency: 'CAD',
      createdAt: '2026-03-27T16:45:00.000Z',
      receiptUrl: 'https://example.com/receipt',
      sessionId: 'cs_123',
    });
  });

  it('returns notification summaries after access checks', async () => {
    const service = makeService();
    const job = makeDetailedJob();

    prisma.job.findFirst.mockResolvedValue(job);
    notifications.getJobNotificationsSummary.mockResolvedValue({
      confirmationSent: true,
    });

    const result = await service.listNotifications({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_1',
    });

    expect(notifications.getJobNotificationsSummary).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(result).toEqual({ confirmationSent: true });
  });

  it('returns job activity after access checks', async () => {
    const service = makeService();
    const job = makeDetailedJob();

    prisma.job.findFirst.mockResolvedValue(job);
    activity.listJobActivity.mockResolvedValue([{ id: 'activity_1' }]);

    const result = await service.listActivity({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_1',
    });

    expect(activity.listJobActivity).toHaveBeenCalledWith(
      'company_1',
      'job_1',
      'client_1',
    );
    expect(result).toEqual([{ id: 'activity_1' }]);
  });

  it('sends job confirmations after access checks', async () => {
    const service = makeService();
    const job = makeDetailedJob();

    prisma.job.findFirst.mockResolvedValue(job);
    notifications.sendJobConfirmation.mockResolvedValue({ ok: true });

    const result = await service.sendConfirmation({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_1',
    });

    expect(notifications.sendJobConfirmation).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(result).toEqual({ ok: true });
  });

  it('updates jobs, syncs assignments, records audit changes, and cancels reminders when canceled', async () => {
    const service = makeService();
    const existing = makeDetailedJob({
      id: 'job_123456',
      title: 'Original title',
      description: 'Original description',
      workerId: 'worker_1',
      assignments: [
        {
          workerId: 'worker_1',
          worker: {
            id: 'worker_1',
            displayName: 'Lena',
            colorTag: '#22c55e',
            phone: '555-0000',
          },
        },
      ],
    });
    const updated = makeDetailedJob({
      id: 'job_123456',
      title: 'Updated title',
      description: 'Updated description',
      status: JobStatus.CANCELED,
      subtotalCents: 30000,
      totalCents: 30000,
      balanceCents: 30000,
      workerId: 'worker_2',
      worker: {
        id: 'worker_2',
        displayName: 'Gus',
        colorTag: '#3b82f6',
        phone: '555-2222',
      },
      assignments: [
        {
          workerId: 'worker_2',
          worker: {
            id: 'worker_2',
            displayName: 'Gus',
            colorTag: '#3b82f6',
            phone: '555-2222',
          },
        },
      ],
      lineItems: [
        {
          id: 'item_2',
          description: 'Deep clean',
          quantity: 2,
          unitPriceCents: 15000,
          totalCents: 30000,
          service: null,
        },
      ],
    });

    prisma.job.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);

    const tx = {
      job: {
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(updated),
      },
      jobLineItem: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      worker: {
        findMany: jest.fn().mockResolvedValue([{ id: 'worker_2' }]),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.updateJob({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_123456',
      dto: {
        title: ' Updated title ',
        description: ' Updated description ',
        workerIds: ['worker_2'],
        lineItems: [
          {
            name: ' Deep clean ',
            quantity: 2,
            unitPriceCents: 15000,
          },
        ],
        status: JobStatus.CANCELED,
      } as any,
    });

    expect(tx.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job_123456' },
        data: expect.objectContaining({
          title: 'Updated title',
          description: 'Updated description',
          subtotalCents: 30000,
          taxCents: 0,
          totalCents: 30000,
          balanceCents: 30000,
          paidAt: null,
        }),
      }),
    );
    expect(tx.jobAssignment.deleteMany).toHaveBeenCalledWith({
      where: { jobId: 'job_123456' },
    });
    expect(tx.jobAssignment.createMany).toHaveBeenCalledWith({
      data: [{ jobId: 'job_123456', workerId: 'worker_2' }],
    });
    expect(activity.logJobCanceled).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_123456',
        actorId: 'user_1',
        actorLabel: 'Mina Manager',
      }),
    );
    expect(notifications.cancelJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_123456',
      'Job canceled',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job_123456',
        status: JobStatus.CANCELED,
        completed: false,
      }),
    );
  });

  it('blocks job updates for non-managers', async () => {
    const service = makeService();
    prisma.membership.findFirst.mockResolvedValue({ role: Role.WORKER });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      name: 'Worker User',
      email: 'worker@example.com',
    });

    await expect(
      service.updateJob({
        companyId: 'company_1',
        roles: ['worker'],
        userSub: 'sub_1',
        id: 'job_1',
        dto: {} as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('completes a job and cancels pending reminders', async () => {
    const service = makeService();
    const job = makeDetailedJob();
    const completedJob = makeDetailedJob({
      status: JobStatus.DONE,
      updatedAt: new Date('2026-03-27T17:00:00.000Z'),
    });

    prisma.job.findFirst.mockResolvedValueOnce(job).mockResolvedValueOnce(completedJob);

    const tx = {
      job: {
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(completedJob),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.completeJob({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      id: 'job_1',
    });

    expect(tx.job.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: { status: JobStatus.DONE },
    });
    expect(activity.logJobCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_1',
        clientId: 'client_1',
      }),
    );
    expect(notifications.cancelJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_1',
      'Job completed',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job_1',
        completed: true,
        status: JobStatus.DONE,
      }),
    );
  });

  it('blocks completing pending bookings before confirmation', async () => {
    const service = makeService();
    const pendingJob = makeDetailedJob({
      status: JobStatus.PENDING_CONFIRMATION,
    });

    prisma.job.findFirst.mockResolvedValue(pendingJob);

    await expect(
      service.completeJob({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        id: 'job_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notifications.cancelJobReminders).not.toHaveBeenCalled();
  });

  it('cancels a job, records activity, and stops reminders', async () => {
    const service = makeService();
    const job = makeDetailedJob({ id: 'job_123456' });
    const canceledJob = makeDetailedJob({
      id: 'job_123456',
      status: JobStatus.CANCELED,
    });

    prisma.job.findFirst.mockResolvedValueOnce(job).mockResolvedValueOnce(canceledJob);

    const tx = {
      job: {
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(canceledJob),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.cancelJob({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      id: 'job_123456',
    });

    expect(activity.logJobCanceled).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_123456',
        actorId: 'user_1',
      }),
    );
    expect(notifications.cancelJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_123456',
      'Job canceled',
    );
    expect(result.status).toBe(JobStatus.CANCELED);
  });

  it('reopens a canceled job and schedules reminders again', async () => {
    const service = makeService();
    const canceledJob = makeDetailedJob({ status: JobStatus.CANCELED });
    const reopenedJob = makeDetailedJob({ status: JobStatus.SCHEDULED });

    prisma.job.findFirst.mockResolvedValueOnce(canceledJob).mockResolvedValueOnce(reopenedJob);

    const tx = {
      job: {
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(reopenedJob),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.reopenJob({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      id: 'job_1',
    });

    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_1',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job_1',
        status: JobStatus.SCHEDULED,
      }),
    );
  });

  it('creates a trimmed job comment and records the audit entry', async () => {
    const service = makeService();
    const job = makeDetailedJob();
    const updatedJob = makeDetailedJob({
      comments: [
        {
          id: 'comment_1',
          message: 'Call before arrival',
          author: {
            id: 'user_1',
            name: 'Mina Manager',
            email: 'mina@example.com',
          },
          createdAt: new Date('2026-03-27T17:15:00.000Z'),
        },
      ],
    });

    prisma.job.findFirst.mockResolvedValueOnce(job).mockResolvedValueOnce(updatedJob);

    const tx = {
      jobComment: { create: jest.fn().mockResolvedValue(undefined) },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
      job: { findFirst: jest.fn().mockResolvedValue(updatedJob) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.createComment({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_123456',
      dto: { body: '  Call before arrival  ' } as any,
    });

    expect(tx.jobComment.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job_123456',
        authorUserId: 'user_1',
        message: 'Call before arrival',
      },
    });
    expect(result.comments[0]).toEqual({
      id: 'comment_1',
      body: 'Call before arrival',
      authorName: 'Mina Manager',
      createdAt: '2026-03-27T17:15:00.000Z',
    });
  });

  it('rejects empty job comments', async () => {
    const service = makeService();
    const job = makeDetailedJob();

    prisma.job.findFirst.mockResolvedValue(job);

    await expect(
      service.createComment({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
        id: 'job_123456',
        dto: { body: '   ' } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates internal notes with normalized text', async () => {
    const service = makeService();
    const job = makeDetailedJob();
    const updatedJob = makeDetailedJob({ internalNotes: 'Use side entrance' });

    prisma.job.findFirst.mockResolvedValueOnce(job).mockResolvedValueOnce(updatedJob);

    const tx = {
      job: {
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(updatedJob),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.updateInternalNotes({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_123456',
      dto: { internalNotes: '  Use side entrance  ' } as any,
    });

    expect(tx.job.update).toHaveBeenCalledWith({
      where: { id: 'job_123456' },
      data: { internalNotes: 'Use side entrance' },
    });
    expect(result.internalNotes).toBe('Use side entrance');
  });

  it('creates a payment link for active jobs and records an audit log', async () => {
    const service = makeService();
    const job = makeDetailedJob({ balanceCents: 4800, currency: 'CAD' });

    prisma.job.findFirst.mockResolvedValue(job);
    payments.createCheckoutSession.mockResolvedValue({
      sessionId: 'cs_123',
      url: 'https://checkout.example.com/cs_123',
    });

    const result = await service.requestPaymentLink({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      id: 'job_123456',
      dto: {
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        idempotencyKey: 'idem_123',
      } as any,
    });

    expect(payments.createCheckoutSession).toHaveBeenCalledWith(
      'company_1',
      'user_1',
      {
        jobId: 'job_123456',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        idempotencyKey: 'idem_123',
      },
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        actorUserId: 'user_1',
        action: 'JOB_PAYMENT_REQUESTED',
        entityType: 'JOB',
        entityId: 'job_123456',
        changes: {
          sessionId: 'cs_123',
          amountCents: 4800,
        },
      },
    });
    expect(result).toEqual({
      jobId: 'job_123456',
      sessionId: 'cs_123',
      url: 'https://checkout.example.com/cs_123',
      amountCents: 4800,
      currency: 'CAD',
    });
  });

  it('rejects payment link requests for canceled jobs', async () => {
    const service = makeService();
    const job = makeDetailedJob({ status: JobStatus.CANCELED });

    prisma.job.findFirst.mockResolvedValue(job);

    await expect(
      service.requestPaymentLink({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
        id: 'job_123456',
        dto: {} as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancellation for non-managers', async () => {
    const service = makeService();
    prisma.membership.findFirst.mockResolvedValue({ role: Role.WORKER });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      name: 'Worker User',
      email: 'worker@example.com',
    });

    await expect(
      service.cancelJob({
        companyId: 'company_1',
        roles: ['worker'],
        userSub: 'sub_1',
        id: 'job_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('routes create calls to the manager workflow when the user is a manager', async () => {
    const service = makeService();
    jest
      .spyOn(service as any, 'createManagerJob')
      .mockResolvedValue({ id: 'job_1' });

    const result = await service.create({
      dto: {
        companyId: 'company_1',
        start: '2026-03-27T18:00:00.000Z',
      } as any,
      roles: ['manager'],
      userSub: 'sub_1',
      companyId: 'company_1',
      idempotencyKey: 'idem_1',
    });

    expect((service as any).createManagerJob).toHaveBeenCalledWith({
      companyId: 'company_1',
      userSub: 'sub_1',
      dto: expect.objectContaining({ companyId: 'company_1' }),
      idempotencyKey: 'idem_1',
    });
    expect(result).toEqual({ id: 'job_1' });
  });

  it('routes create calls to the worker workflow when the user is a worker', async () => {
    const service = makeService();
    jest
      .spyOn(service as any, 'createWorkerJob')
      .mockResolvedValue({ id: 'job_2' });

    const result = await service.create({
      dto: {
        companyId: 'company_1',
        serviceId: 'service_1',
        start: '2026-03-27T18:00:00.000Z',
      } as any,
      roles: ['worker'],
      userSub: 'sub_1',
      companyId: null,
      idempotencyKey: 'idem_2',
    });

    expect((service as any).createWorkerJob).toHaveBeenCalledWith({
      companyId: 'company_1',
      userSub: 'sub_1',
      dto: expect.objectContaining({ companyId: 'company_1' }),
      idempotencyKey: 'idem_2',
    });
    expect(result).toEqual({ id: 'job_2' });
  });

  it('validates create company scoping before choosing a workflow', async () => {
    const service = makeService();

    await expect(
      service.create({
        dto: { start: '2026-03-27T18:00:00.000Z' } as any,
        roles: ['manager'],
        userSub: 'sub_1',
        companyId: null,
      }),
    ).rejects.toThrow('companyId is required');

    await expect(
      service.create({
        dto: {
          companyId: 'company_2',
          start: '2026-03-27T18:00:00.000Z',
        } as any,
        roles: ['manager'],
        userSub: 'sub_1',
        companyId: 'company_1',
      }),
    ).rejects.toThrow('companyId mismatch');

    await expect(
      service.create({
        dto: {
          companyId: 'company_1',
          start: '2026-03-27T18:00:00.000Z',
        } as any,
        roles: ['client'],
        userSub: 'sub_1',
        companyId: 'company_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a manager job with line items, idempotency tracking, and reminders', async () => {
    const service = makeService();
    const createdJob = makeDetailedJob({
      id: 'job_created',
      title: 'Custom booking',
      workerId: 'worker_1',
      assignments: [
        {
          workerId: 'worker_1',
          worker: {
            id: 'worker_1',
            displayName: 'Lena',
            colorTag: '#22c55e',
            phone: '555-0000',
          },
        },
        {
          workerId: 'worker_2',
          worker: {
            id: 'worker_2',
            displayName: 'Gus',
            colorTag: '#3b82f6',
            phone: '555-2222',
          },
        },
      ],
      lineItems: [
        {
          id: 'item_1',
          description: 'Deep clean',
          quantity: 2,
          unitPriceCents: 15000,
          totalCents: 30000,
          service: null,
        },
      ],
      totalCents: 30000,
      subtotalCents: 30000,
      balanceCents: 30000,
    });

    jest.spyOn(service as any, 'resolveAccess').mockResolvedValue({
      isManager: true,
      workerId: 'worker_1',
      userId: 'user_1',
      userName: 'Mina Manager',
    });
    jest.spyOn(service as any, 'findService').mockResolvedValue({
      id: 'service_1',
      name: 'Deep clean',
      durationMins: 120,
      basePriceCents: 15000,
      currency: 'CAD',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue([
      'worker_1',
      'worker_2',
    ]);
    jest.spyOn(service as any, 'resolveClientId').mockResolvedValue('client_1');
    jest
      .spyOn(service as any, 'assertNoWorkerConflicts')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValue(createdJob);

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
      job: {
        create: jest.fn().mockResolvedValue({
          id: 'job_created',
          title: 'Custom booking',
        }),
      },
      jobLineItem: {
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any, options: any) => {
      expect(options).toEqual({ isolationLevel: 'Serializable' });
      return callback(tx);
    });

    const result = await (service as any).createManagerJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      idempotencyKey: 'idem_123',
      dto: {
        serviceId: 'service_1',
        start: '2026-03-27T18:00:00.000Z',
        title: '  Custom booking  ',
        description: '  Handle with care  ',
        internalNotes: '  VIP client  ',
        client: {
          name: 'Owen Khan',
          address: ' 123 Main St ',
        },
        lineItems: [
          {
            name: ' Deep clean ',
            quantity: 2,
            unitPriceCents: 15000,
          },
        ],
      },
    });

    expect(tx.idempotencyKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'idem_123',
        companyId: 'company_1',
      }),
    });
    expect(tx.job.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        clientId: 'client_1',
        workerId: 'worker_1',
        title: 'Custom booking',
        description: 'Handle with care',
        internalNotes: 'VIP client',
        location: '123 Main St',
        startAt: new Date('2026-03-27T18:00:00.000Z'),
        endAt: new Date('2026-03-27T20:00:00.000Z'),
        status: JobStatus.SCHEDULED,
        subtotalCents: 30000,
        taxCents: 0,
        totalCents: 30000,
        paidCents: 0,
        balanceCents: 30000,
        currency: 'CAD',
      },
    });
    expect(tx.jobLineItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job_created',
          serviceId: null,
          description: 'Deep clean',
          quantity: 2,
          unitPriceCents: 15000,
          taxRateBps: 0,
          totalCents: 30000,
        },
      ],
    });
    expect(tx.jobAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { jobId: 'job_created', workerId: 'worker_1' },
        { jobId: 'job_created', workerId: 'worker_2' },
      ],
    });
    expect(activity.logJobCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_created',
        clientId: 'client_1',
        actorId: 'user_1',
        actorLabel: 'Mina Manager',
      }),
    );
    expect(tx.idempotencyKey.update).toHaveBeenCalledWith({
      where: { key: 'idem_123' },
      data: { jobId: 'job_created' },
    });
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_created',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job_created',
        title: 'Custom booking',
      }),
    );
  });

  it('returns the existing manager job when an idempotency key already points to one', async () => {
    const service = makeService();
    const existingJob = makeDetailedJob({ id: 'job_existing' });
    const dto = {
      start: '2026-03-27T18:00:00.000Z',
      end: '2026-03-27T19:00:00.000Z',
      title: ' Window cleaning ',
      client: {
        name: 'Owen Khan',
        address: '123 Main St',
      },
      lineItems: [
        {
          name: ' Window cleaning ',
          quantity: 1,
          unitPriceCents: 10000,
        },
      ],
    };
    const requestHash = hashRequestBody({
      companyId: 'company_1',
      clientId: null,
      client: dto.client,
      workerIds: [],
      title: 'Window cleaning',
      description: null,
      internalNotes: null,
      location: '123 Main St',
      start: '2026-03-27T18:00:00.000Z',
      end: '2026-03-27T19:00:00.000Z',
      lineItems: [
        {
          name: 'Window cleaning',
          quantity: 1,
          unitPriceCents: 10000,
          serviceId: null,
        },
      ],
    });

    jest.spyOn(service as any, 'resolveAccess').mockResolvedValue({
      isManager: true,
      workerId: 'worker_1',
      userId: 'user_1',
      userName: 'Mina Manager',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue([]);
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValue(existingJob);
    const conflictsSpy = jest
      .spyOn(service as any, 'assertNoWorkerConflicts')
      .mockResolvedValue(undefined);

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash,
          jobId: 'job_existing',
        }),
      },
      job: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const result = await (service as any).createManagerJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      idempotencyKey: 'idem_existing',
      dto,
    });

    expect(tx.job.create).not.toHaveBeenCalled();
    expect(conflictsSpy).not.toHaveBeenCalled();
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_existing',
    );
    expect(result).toEqual(expect.objectContaining({ id: 'job_existing' }));
  });

  it('rejects manager job creation when an idempotency key is reused with a different payload', async () => {
    const service = makeService();

    jest.spyOn(service as any, 'resolveAccess').mockResolvedValue({
      isManager: true,
      workerId: 'worker_1',
      userId: 'user_1',
      userName: 'Mina Manager',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue([]);

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash: 'different_hash',
          jobId: null,
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      (service as any).createManagerJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        idempotencyKey: 'idem_conflict',
        dto: {
          start: '2026-03-27T18:00:00.000Z',
          end: '2026-03-27T19:00:00.000Z',
          lineItems: [
            {
              name: 'Window cleaning',
              quantity: 1,
              unitPriceCents: 10000,
            },
          ],
          client: {
            name: 'Owen Khan',
          },
        },
      }),
    ).rejects.toThrow('Idempotency key re-used with different payload');
  });

  it('creates a worker job for the actor and schedules reminders', async () => {
    const service = makeService();
    const createdJob = makeDetailedJob({
      id: 'job_worker',
      workerId: 'worker_1',
      title: 'Move-out cleaning',
      lineItems: [
        {
          id: 'item_1',
          description: 'Move-out cleaning',
          quantity: 1,
          unitPriceCents: 22000,
          totalCents: 22000,
          service: null,
        },
      ],
      subtotalCents: 22000,
      totalCents: 22000,
      balanceCents: 22000,
    });

    jest.spyOn(service as any, 'findService').mockResolvedValue({
      id: 'service_1',
      name: 'Move-out cleaning',
      durationMins: 90,
      basePriceCents: 22000,
      currency: 'CAD',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue([]);
    jest
      .spyOn(service as any, 'assertNoWorkerConflicts')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'resolveClientId').mockResolvedValue('client_1');
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValue(createdJob);
    prisma.worker.findFirst.mockResolvedValue({
      id: 'worker_1',
      user: {
        id: 'user_1',
        name: 'Lena Cleaner',
        email: 'lena@example.com',
      },
    });
    slots.isSlotBookable.mockResolvedValue(true);

    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
      job: {
        create: jest.fn().mockResolvedValue({
          id: 'job_worker',
        }),
      },
      jobLineItem: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const result = await (service as any).createWorkerJob({
      companyId: 'company_1',
      userSub: 'sub_1',
      idempotencyKey: 'idem_worker',
      dto: {
        serviceId: 'service_1',
        start: '2026-03-27T18:00:00.000Z',
        client: {
          firstName: 'Owen',
          lastName: 'Khan',
        },
      },
    });

    expect(slots.isSlotBookable).toHaveBeenCalledWith({
      workerId: 'worker_1',
      serviceId: 'service_1',
      companyId: 'company_1',
      start: new Date('2026-03-27T18:00:00.000Z'),
      end: new Date('2026-03-27T19:30:00.000Z'),
    });
    expect(tx.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company_1',
        clientId: 'client_1',
        workerId: 'worker_1',
        title: 'Move-out cleaning',
        subtotalCents: 22000,
        totalCents: 22000,
        balanceCents: 22000,
      }),
    });
    expect(tx.jobLineItem.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job_worker',
        serviceId: 'service_1',
        description: 'Move-out cleaning',
        quantity: 1,
        unitPriceCents: 22000,
        taxRateBps: 0,
        totalCents: 22000,
      },
    });
    expect(activity.logJobCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job_worker',
        actorId: 'user_1',
        actorLabel: 'Lena Cleaner',
      }),
    );
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_worker',
    );
    expect(result).toEqual(expect.objectContaining({ id: 'job_worker' }));
  });

  it('blocks workers from creating jobs for other workers', async () => {
    const service = makeService();

    jest.spyOn(service as any, 'findService').mockResolvedValue({
      id: 'service_1',
      name: 'Move-out cleaning',
      durationMins: 90,
      basePriceCents: 22000,
      currency: 'CAD',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue(['worker_2']);
    prisma.worker.findFirst.mockResolvedValue({
      id: 'worker_1',
      user: {
        id: 'user_1',
        name: 'Lena Cleaner',
        email: 'lena@example.com',
      },
    });

    await expect(
      (service as any).createWorkerJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          start: '2026-03-27T18:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects worker job creation when the slot is no longer available', async () => {
    const service = makeService();

    jest.spyOn(service as any, 'findService').mockResolvedValue({
      id: 'service_1',
      name: 'Move-out cleaning',
      durationMins: 90,
      basePriceCents: 22000,
      currency: 'CAD',
    });
    jest.spyOn(service as any, 'resolveNextWorkerIds').mockResolvedValue([]);
    prisma.worker.findFirst.mockResolvedValue({
      id: 'worker_1',
      user: {
        id: 'user_1',
        name: 'Lena Cleaner',
        email: 'lena@example.com',
      },
    });
    slots.isSlotBookable.mockResolvedValue(false);

    await expect(
      (service as any).createWorkerJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        dto: {
          serviceId: 'service_1',
          start: '2026-03-27T18:00:00.000Z',
        },
      }),
    ).rejects.toThrow('Slot is no longer available');
  });

  it('delegates company worker and booking review operations to the schedule service', async () => {
    const service = makeService();
    schedule.listCompanyWorkers.mockResolvedValue([{ id: 'worker_1' }]);
    schedule.reviewJob.mockResolvedValue({ ok: true });
    schedule.confirmJob.mockResolvedValue({ confirmed: true });

    await expect(
      service.listCompanyWorkers({
        companyId: 'company_1',
        userSub: 'sub_1',
      }),
    ).resolves.toEqual([{ id: 'worker_1' }]);

    await expect(
      service.reviewJob({
        companyId: 'company_1',
        userSub: 'sub_1',
        jobId: 'job_1',
        dto: { approved: true } as any,
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      service.confirmJob('company_1', 'job_1', 'user_1'),
    ).resolves.toEqual({ confirmed: true });
  });

  it('resolves manager access context from user, membership, and worker records', async () => {
    const service = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      name: null,
      email: 'manager@example.com',
    });
    prisma.membership.findFirst.mockResolvedValue({ role: Role.MANAGER });
    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_9' });

    const result = await (service as any).resolveAccess(
      'company_1',
      ['manager'],
      'sub_1',
    );

    expect(result).toEqual({
      isManager: true,
      workerId: 'worker_9',
      userId: 'user_1',
      userName: 'manager@example.com',
    });
  });

  it('enforces assignment-based access for non-managers', () => {
    const service = makeService();
    const job = makeDetailedJob({
      workerId: 'worker_1',
      assignments: [{ workerId: 'worker_2', worker: null }],
    });

    expect(() =>
      (service as any).assertCanAccessJob(job, {
        isManager: false,
        workerId: 'worker_2',
        userId: 'user_1',
        userName: 'Worker User',
      }),
    ).not.toThrow();

    expect(() =>
      (service as any).assertCanAccessJob(job, {
        isManager: false,
        workerId: 'worker_9',
        userId: 'user_1',
        userName: 'Worker User',
      }),
    ).toThrow(ForbiddenException);
  });

  it('covers helper methods for reminders, totals, titles, and line item validation', async () => {
    const service = makeService();

    await (service as any).syncJobReminderLifecycle(
      'company_1',
      'job_1',
      JobStatus.CANCELED,
    );
    await (service as any).syncJobReminderLifecycle(
      'company_1',
      'job_2',
      JobStatus.DONE,
    );
    await (service as any).syncJobReminderLifecycle(
      'company_1',
      'job_3',
      JobStatus.SCHEDULED,
    );

    expect(notifications.cancelJobReminders).toHaveBeenNthCalledWith(
      1,
      'company_1',
      'job_1',
      'Job canceled',
    );
    expect(notifications.cancelJobReminders).toHaveBeenNthCalledWith(
      2,
      'company_1',
      'job_2',
      'Job completed',
    );
    expect(notifications.scheduleJobReminders).toHaveBeenCalledWith(
      'company_1',
      'job_3',
    );

    expect((service as any).buildJobNumber('job_abcdef123456')).toBe(
      'JOB-123456',
    );
    expect((service as any).mapVisitStatus(JobStatus.CANCELED)).toBe(
      'CANCELED',
    );
    expect((service as any).mapVisitStatus(JobStatus.DONE)).toBe('COMPLETED');
    expect((service as any).mapVisitStatus(JobStatus.SCHEDULED)).toBe(
      'SCHEDULED',
    );
    expect((service as any).normalizeOptionalText('  Keep this  ')).toBe(
      'Keep this',
    );
    expect((service as any).normalizeOptionalText('   ')).toBeNull();
    expect(
      (service as any).calculateTotals(
        [{ quantity: 2, unitPriceCents: 1500 }],
        500,
      ),
    ).toEqual({
      subtotalCents: 3000,
      taxCents: 0,
      totalCents: 3000,
      balanceCents: 2500,
    });
    expect(
      (service as any).resolveJobTitle(
        { title: '  Custom title  ' },
        { name: 'Service title' },
        [{ name: 'Fallback item', quantity: 1, unitPriceCents: 1000 }],
      ),
    ).toBe('Custom title');
    expect(
      (service as any).resolveCreateLineItems(
        { lineItems: [{ name: '  Add-on  ', quantity: 2, unitPriceCents: 500 }] },
        null,
      ),
    ).toEqual([
      {
        name: 'Add-on',
        quantity: 2,
        unitPriceCents: 500,
        serviceId: null,
      },
    ]);
    expect(
      (service as any).getActivityJobLabel({
        title: '   ',
        lineItems: [{ description: '  Fallback title  ' }],
      }),
    ).toBe('Fallback title');

    expect(() =>
      (service as any).normalizeLineItems([
        { name: '  ', quantity: 1, unitPriceCents: 1000 },
      ]),
    ).toThrow(BadRequestException);
    expect(() =>
      (service as any).normalizeLineItems([
        { name: 'Item', quantity: 0, unitPriceCents: 1000 },
      ]),
    ).toThrow('Line item quantity must be at least 1');
    expect(() =>
      (service as any).normalizeLineItems([
        { name: 'Item', quantity: 1, unitPriceCents: -1 },
      ]),
    ).toThrow('Line item unit price cannot be negative');
    expect(() =>
      (service as any).resolveCreateLineItems({}, null),
    ).toThrow('Provide a service or at least one line item');
    expect(() =>
      (service as any).resolveJobEnd(
        new Date('2026-03-27T18:00:00.000Z'),
        'bad-date',
        null,
      ),
    ).toThrow('Invalid end');
    expect(() =>
      (service as any).resolveJobEnd(
        new Date('2026-03-27T18:00:00.000Z'),
        '2026-03-27T17:00:00.000Z',
        null,
      ),
    ).toThrow('End time must be after start time');
    expect(
      (service as any).resolveJobEnd(
        new Date('2026-03-27T18:00:00.000Z'),
        undefined,
        null,
      ),
    ).toEqual(new Date('2026-03-27T19:00:00.000Z'));
    expect((service as any).areStringArraysEqual(['a'], ['a', 'b'])).toBe(
      false,
    );
  });

  it('covers service lookup, client resolution, worker conflict checks, and assignment helpers', async () => {
    const service = makeService();

    prisma.service.findUnique.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Move-out cleaning',
      durationMins: 90,
      basePriceCents: 22000,
      currency: 'CAD',
    });
    await expect(
      (service as any).findService('company_1', 'service_1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'service_1',
        name: 'Move-out cleaning',
      }),
    );

    prisma.service.findUnique.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_2',
      name: 'Move-out cleaning',
      durationMins: 90,
      basePriceCents: 22000,
      currency: 'CAD',
    });
    await expect(
      (service as any).findService('company_1', 'service_1'),
    ).rejects.toThrow('Invalid service');

    const existingClientTx = {
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'client_existing' }),
      },
    };
    await expect(
      (service as any).resolveClientId(existingClientTx, 'company_1', {
        clientId: 'client_existing',
      }),
    ).resolves.toBe('client_existing');

    const invalidClientTx = {
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    await expect(
      (service as any).resolveClientId(invalidClientTx, 'company_1', {
        clientId: 'missing_client',
      }),
    ).rejects.toThrow('Invalid client');

    const matchingEmailTx = {
      clientProfile: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'client_by_email' }),
      },
    };
    await expect(
      (service as any).resolveClientId(matchingEmailTx, 'company_1', {
        client: {
          firstName: ' Owen ',
          lastName: ' Khan ',
          email: ' Owen@Example.com ',
          phone: ' 555-1234 ',
          address: ' 123 Main St ',
          notes: ' Gate code 1234 ',
        },
      }),
    ).resolves.toBe('client_by_email');

    const newClientTx = {
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'client_new' }),
      },
    };
    await expect(
      (service as any).resolveClientId(newClientTx, 'company_1', {
        client: {
          firstName: ' Owen ',
          lastName: ' Khan ',
          email: ' Owen@Example.com ',
          phone: ' 555-1234 ',
          address: ' 123 Main St ',
          notes: ' Gate code 1234 ',
        },
      }),
    ).resolves.toBe('client_new');
    expect(newClientTx.clientProfile.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        name: 'Owen Khan',
        email: 'owen@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: 'Gate code 1234',
      },
      select: { id: true },
    });

    await expect(
      (service as any).resolveClientId(
        { clientProfile: { findFirst: jest.fn() } },
        'company_1',
        {},
      ),
    ).rejects.toThrow('clientId or client is required');

    expect((service as any).resolveClientName('  Mina Moss  ')).toBe(
      'Mina Moss',
    );
    expect(() => (service as any).resolveClientName(undefined, ' ', ' ')).toThrow(
      'Client name is required',
    );

    const noWorkersTx = {
      job: { findFirst: jest.fn() },
    };
    await expect(
      (service as any).assertNoWorkerConflicts(
        noWorkersTx,
        'company_1',
        [],
        new Date('2026-03-27T18:00:00.000Z'),
        new Date('2026-03-27T19:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();
    expect(noWorkersTx.job.findFirst).not.toHaveBeenCalled();

    const conflictTx = {
      job: { findFirst: jest.fn().mockResolvedValue({ id: 'job_conflict' }) },
    };
    await expect(
      (service as any).assertNoWorkerConflicts(
        conflictTx,
        'company_1',
        ['worker_1'],
        new Date('2026-03-27T18:00:00.000Z'),
        new Date('2026-03-27T19:00:00.000Z'),
      ),
    ).rejects.toThrow('Overlapping booking');

    const assignmentTx = {
      jobAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        createMany: jest.fn().mockResolvedValue(undefined),
      },
      worker: {
        findMany: jest.fn().mockResolvedValue([{ id: 'worker_7' }]),
      },
    };
    await expect(
      (service as any).syncJobAssignments(assignmentTx, 'job_1', []),
    ).resolves.toBeUndefined();
    expect(assignmentTx.jobAssignment.deleteMany).toHaveBeenCalledWith({
      where: { jobId: 'job_1' },
    });
    expect(assignmentTx.jobAssignment.createMany).not.toHaveBeenCalled();

    await expect(
      (service as any).resolveNextWorkerIds(
        assignmentTx,
        'company_1',
        undefined,
        'worker_7',
      ),
    ).resolves.toEqual(['worker_7']);
    await expect(
      (service as any).validateWorkerId(assignmentTx, 'company_1', null),
    ).resolves.toBeNull();
  });

  it('validates worker ids with deduping and rejects unknown workers', async () => {
    const service = makeService();
    prisma.worker.findMany.mockResolvedValue([{ id: 'worker_1' }, { id: 'worker_2' }]);

    await expect(
      (service as any).validateWorkerIds(
        prisma,
        'company_1',
        ['worker_1', 'worker_1', 'worker_2'],
      ),
    ).resolves.toEqual(['worker_1', 'worker_2']);

    prisma.worker.findMany.mockResolvedValue([{ id: 'worker_1' }]);

    await expect(
      (service as any).validateWorkerIds(
        prisma,
        'company_1',
        ['worker_1', 'worker_2'],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
