import { ForbiddenException } from '@nestjs/common';
import { ActivityActorType, ActivityType } from '@prisma/client';
import { ActivityService } from '../activity.service';

describe('ActivityService', () => {
  const prisma = {
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
  };

  const makeService = () => new ActivityService(prisma as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('stores reschedules with metadata that maps back to JOB_RESCHEDULED', async () => {
    prisma.activity.create.mockResolvedValue({ id: 'activity_1' });

    const service = makeService();
    await service.logJobRescheduled({
      companyId: 'company_1',
      jobId: 'job_1',
      clientId: 'client_1',
      actorId: 'user_1',
      actorLabel: 'Mina Manager',
      message: 'Window cleaning was rescheduled for Owen Khan.',
      metadata: {
        clientName: 'Owen Khan',
      },
    });

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company_1',
        type: ActivityType.JOB_CREATED,
        actorType: ActivityActorType.USER,
        entityType: 'job',
        entityId: 'job_1',
        jobId: 'job_1',
        clientId: 'client_1',
        message: 'Window cleaning was rescheduled for Owen Khan.',
        metadata: expect.objectContaining({
          clientName: 'Owen Khan',
          activityType: 'JOB_RESCHEDULED',
        }),
      }),
    });
  });

  it('maps response metadata back to JOB_RESCHEDULED for recent activity', async () => {
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership_1' });
    prisma.activity.findMany.mockResolvedValue([
      {
        id: 'activity_1',
        type: ActivityType.JOB_CREATED,
        actorType: ActivityActorType.USER,
        actorId: 'user_1',
        actorLabel: 'Mina Manager',
        entityType: 'job',
        entityId: 'job_1',
        jobId: 'job_1',
        clientId: 'client_1',
        createdAt: new Date('2026-03-27T15:00:00.000Z'),
        message: 'Window cleaning was rescheduled for Owen Khan.',
        metadata: {
          activityType: 'JOB_RESCHEDULED',
          clientName: 'Owen Khan',
        },
      },
    ]);

    const service = makeService();
    const result = await service.listRecentActivity({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      hours: 24,
      limit: 10,
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'activity_1',
        type: 'JOB_RESCHEDULED',
        message: 'Window cleaning was rescheduled for Owen Khan.',
      }),
    ]);
  });

  it('rejects recent activity for non-manager roles', async () => {
    const service = makeService();

    await expect(
      service.listRecentActivity({
        companyId: 'company_1',
        roles: ['worker'],
        userSub: 'sub_1',
        hours: 24,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
