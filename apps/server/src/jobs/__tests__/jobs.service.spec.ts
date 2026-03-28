import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { JobsService } from '../jobs.service';

describe('JobsService', () => {
  const prisma = {
    $transaction: jest.fn(),
  };

  const notifications = {
    cancelJobReminders: jest.fn(),
    scheduleJobReminders: jest.fn(),
  };

  const activity = {
    logJobCompleted: jest.fn(),
    logJobCanceled: jest.fn(),
  };

  const makeService = () =>
    new JobsService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      notifications as any,
      activity as any,
    );

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
  });

  it('completes a job and cancels pending reminders', async () => {
    const service = makeService();
    const job = makeDetailedJob();
    const completedJob = makeDetailedJob({
      status: JobStatus.DONE,
      updatedAt: new Date('2026-03-27T17:00:00.000Z'),
    });

    jest
      .spyOn(service as any, 'resolveAccess')
      .mockResolvedValue({
        isManager: true,
        workerId: 'worker_1',
        userId: 'user_1',
        userName: 'Mina Manager',
      });
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(completedJob);
    jest
      .spyOn(service as any, 'assertCanAccessJob')
      .mockImplementation(() => undefined);

    const tx = {
      job: { update: jest.fn().mockResolvedValue(undefined) },
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

    jest
      .spyOn(service as any, 'resolveAccess')
      .mockResolvedValue({
        isManager: true,
        workerId: 'worker_1',
        userId: 'user_1',
        userName: 'Mina Manager',
      });
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValue(pendingJob);
    jest
      .spyOn(service as any, 'assertCanAccessJob')
      .mockImplementation(() => undefined);

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

  it('reopens a canceled job and schedules reminders again', async () => {
    const service = makeService();
    const canceledJob = makeDetailedJob({ status: JobStatus.CANCELED });
    const reopenedJob = makeDetailedJob({ status: JobStatus.SCHEDULED });

    jest
      .spyOn(service as any, 'resolveAccess')
      .mockResolvedValue({
        isManager: true,
        workerId: 'worker_1',
        userId: 'user_1',
        userName: 'Mina Manager',
      });
    jest
      .spyOn(service as any, 'findDetailedJobOrThrow')
      .mockResolvedValueOnce(canceledJob)
      .mockResolvedValueOnce(reopenedJob);

    const tx = {
      job: { update: jest.fn().mockResolvedValue(undefined) },
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

  it('rejects cancellation for non-managers', async () => {
    const service = makeService();

    jest
      .spyOn(service as any, 'resolveAccess')
      .mockResolvedValue({
        isManager: false,
        workerId: 'worker_1',
        userId: 'user_1',
        userName: 'Worker User',
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
});
