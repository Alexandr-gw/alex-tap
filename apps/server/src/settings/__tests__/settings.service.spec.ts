import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { SettingsService } from '../settings.service';

describe('SettingsService', () => {
  const prisma = {
    membership: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    worker: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const audit = {
    record: jest.fn(),
  };

  const makeService = () => new SettingsService(prisma as any, audit as any);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership_1',
      userId: 'user_1',
    });
  });

  it('returns company settings for managers', async () => {
    const service = makeService();

    prisma.company.findFirst.mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap',
      timezone: 'America/Edmonton',
      slug: 'alex-tap-demo',
      updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    });

    const result = await service.getCompanySettings({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
    });

    expect(result).toEqual({
      id: 'company_1',
      name: 'Alex Tap',
      timezone: 'America/Edmonton',
      bookingSlug: 'alex-tap-demo',
      updatedAt: '2026-03-30T10:00:00.000Z',
    });
  });

  it('updates company settings, normalizes slug, and records audit', async () => {
    const service = makeService();
    const getCompanySpy = jest.spyOn(service, 'getCompanySettings').mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap Home Services',
      timezone: 'America/Edmonton',
      bookingSlug: 'alex-tap-home-services',
      updatedAt: '2026-03-31T10:00:00.000Z',
    });

    prisma.company.findFirst.mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap',
      timezone: 'America/Edmonton',
      slug: 'alex-tap-demo',
    });
    prisma.company.update.mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap Home Services',
      timezone: 'America/Edmonton',
      slug: 'alex-tap-home-services',
    });

    const result = await service.updateCompanySettings({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      dto: {
        name: ' Alex Tap Home Services ',
        bookingSlug: ' Alex Tap Home Services! ',
      } as any,
    });

    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company_1' },
      data: {
        name: 'Alex Tap Home Services',
        slug: 'alex-tap-home-services',
      },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        actorUserId: 'user_1',
        entityType: 'company',
        entityId: 'company_1',
        action: 'COMPANY_SETTINGS_UPDATED',
      }),
    );
    expect(getCompanySpy).toHaveBeenCalled();
    expect(result.bookingSlug).toBe('alex-tap-home-services');
  });

  it('maps duplicate booking slug errors to a conflict', async () => {
    const service = makeService();

    prisma.company.findFirst.mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap',
      timezone: 'America/Edmonton',
      slug: 'alex-tap-demo',
    });
    prisma.company.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.16.2',
      }),
    );

    await expect(
      service.updateCompanySettings({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        dto: { bookingSlug: 'taken' } as any,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists workers with mapped role and linked email', async () => {
    const service = makeService();

    prisma.$transaction.mockResolvedValue([
      1,
      [
        {
          id: 'worker_1',
          displayName: 'Gus Gutter',
          phone: '780-111-2222',
          colorTag: 'green',
          active: true,
          createdAt: new Date('2026-03-01T10:00:00.000Z'),
          user: {
            email: 'gus@example.com',
            sub: 'sub_worker',
            memberships: [{ role: 'WORKER' }],
          },
        },
      ],
    ]);

    const result = await service.listWorkers({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      query: { page: 1, limit: 20, search: 'Gus' } as any,
    });

    expect(result.items[0]).toEqual({
      id: 'worker_1',
      name: 'Gus Gutter',
      phone: '780-111-2222',
      colorTag: 'green',
      active: true,
      linkedUserEmail: 'gus@example.com',
      role: 'WORKER',
      createdAt: '2026-03-01T10:00:00.000Z',
    });
  });

  it('creates a worker and records audit', async () => {
    const service = makeService();

    prisma.worker.create.mockResolvedValue({
      id: 'worker_1',
      displayName: 'Gus Gutter',
      phone: '780-111-2222',
      colorTag: 'blue',
      active: true,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      user: null,
    });

    const result = await service.createWorker({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      dto: {
        name: ' Gus Gutter ',
        phone: ' 780-111-2222 ',
        colorTag: ' blue ',
      } as any,
    });

    expect(prisma.worker.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        displayName: 'Gus Gutter',
        phone: '780-111-2222',
        colorTag: 'blue',
        active: true,
      },
      select: expect.any(Object),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        entityType: 'worker',
        entityId: 'worker_1',
        action: 'WORKER_CREATED',
      }),
    );
    expect(result.name).toBe('Gus Gutter');
  });

  it('prevents changing your own role from the workers settings page', async () => {
    const service = makeService();

    prisma.worker.findFirst.mockResolvedValue({
      id: 'worker_1',
      displayName: 'Gus Gutter',
      phone: null,
      colorTag: null,
      active: true,
      userId: 'user_1',
      user: {
        sub: 'sub_1',
        memberships: [{ role: Role.WORKER }],
      },
    });

    await expect(
      service.updateWorker({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
        workerId: 'worker_1',
        dto: { role: Role.MANAGER } as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects blank worker names during update', async () => {
    const service = makeService();

    prisma.worker.findFirst.mockResolvedValue({
      id: 'worker_1',
      displayName: 'Gus Gutter',
      phone: null,
      colorTag: null,
      active: true,
      userId: null,
      user: null,
    });

    await expect(
      service.updateWorker({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        workerId: 'worker_1',
        dto: { name: '   ' } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when company settings record is missing', async () => {
    const service = makeService();
    prisma.company.findFirst.mockResolvedValue(null);

    await expect(
      service.getCompanySettings({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
