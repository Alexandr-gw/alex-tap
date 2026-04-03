import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientsService } from '../clients.service';

describe('ClientsService', () => {
  const prisma = {
    membership: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
    clientProfile: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  };

  const notifications = {
    getLatestClientCommunication: jest.fn(),
  };

  const activity = {
    logClientCreated: jest.fn(),
  };

  const audit = {
    record: jest.fn(),
  };

  const makeService = () =>
    new ClientsService(
      prisma as any,
      notifications as any,
      activity as any,
      audit as any,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership_1',
      userId: 'user_1',
      user: {
        name: 'Mina Manager',
        email: 'mina@example.com',
      },
    });
  });

  it('lists clients with mapped meta and last job timestamp', async () => {
    const service = makeService();

    prisma.$transaction.mockResolvedValue([
      2,
      [
        {
          id: 'client_1',
          name: 'Brandon McConnery',
          email: 'brandon@example.com',
          phone: '780-111-2222',
          address: '123 Main St',
          createdAt: new Date('2026-03-01T10:00:00.000Z'),
          updatedAt: new Date('2026-03-29T10:00:00.000Z'),
          jobs: [{ startAt: new Date('2026-03-29T17:45:00.000Z') }],
          _count: { jobs: 3 },
        },
      ],
    ]);

    const result = await service.list({
      companyId: 'company_1',
      roles: ['admin'],
      userSub: 'sub_1',
      query: { search: 'Brandon', page: 1, limit: 20 } as any,
    });

    expect(result).toEqual({
      items: [
        {
          id: 'client_1',
          name: 'Brandon McConnery',
          email: 'brandon@example.com',
          phone: '780-111-2222',
          address: '123 Main St',
          jobsCount: 3,
          lastJobAt: '2026-03-29T17:45:00.000Z',
          createdAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('creates a client, normalizes fields, and records audit/activity', async () => {
    const service = makeService();
    const getOneSpy = jest.spyOn(service, 'getOne').mockResolvedValue({
      id: 'client_1',
      name: 'Brandon McConnery',
    } as any);

    prisma.clientProfile.findFirst.mockResolvedValue(null);
    prisma.clientProfile.create.mockResolvedValue({
      id: 'client_1',
      name: 'Brandon McConnery',
      email: 'brandon@example.com',
      phone: '780-111-2222',
      address: '123 Main St',
    });

    const result = await service.create({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      dto: {
        firstName: 'Brandon',
        lastName: 'McConnery',
        email: ' Brandon@Example.com ',
        phone: ' 780-111-2222 ',
        address: ' 123 Main St ',
        notes: ' internal note ',
      } as any,
    });

    expect(prisma.clientProfile.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        name: 'Brandon McConnery',
        email: 'brandon@example.com',
        phone: '780-111-2222',
        address: '123 Main St',
        internalNotes: 'internal note',
        notes: null,
      },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        actorUserId: 'user_1',
        entityType: 'client',
        entityId: 'client_1',
        action: 'CLIENT_CREATED',
      }),
    );
    expect(activity.logClientCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        clientId: 'client_1',
        actorId: 'user_1',
        actorLabel: 'Mina Manager',
      }),
    );
    expect(getOneSpy).toHaveBeenCalled();
    expect(result).toEqual({ id: 'client_1', name: 'Brandon McConnery' });
  });

  it('rejects duplicate emails during create', async () => {
    const service = makeService();

    prisma.clientProfile.findFirst.mockResolvedValue({ id: 'client_existing' });

    await expect(
      service.create({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        dto: {
          name: 'Brandon McConnery',
          email: 'brandon@example.com',
        } as any,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns mapped client details with jobs, tasks, payments, and last communication', async () => {
    const service = makeService();

    prisma.clientProfile.findFirst.mockResolvedValue({
      id: 'client_1',
      name: 'Brandon McConnery',
      email: 'brandon@example.com',
      phone: '780-111-2222',
      address: '123 Main St',
      notes: 'Please use side gate',
      internalNotes: 'VIP customer',
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-29T10:00:00.000Z'),
      jobs: [
        {
          id: 'job_1',
          title: 'Deep Move-Out Cleaning',
          status: 'SCHEDULED',
          startAt: new Date('2026-03-30T15:45:00.000Z'),
          totalCents: 32500,
          worker: { displayName: 'Gus Gutter' },
          assignments: [{ worker: { displayName: 'Lena Lawn' } }],
        },
      ],
      tasks: [
        {
          id: 'task_1',
          subject: 'Call customer',
          completed: false,
          startAt: new Date('2026-03-29T18:00:00.000Z'),
          assignments: [{ worker: { displayName: 'Gus Gutter' } }],
        },
      ],
    });
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'payment_1',
        amountCents: 32500,
        status: 'SUCCEEDED',
        provider: 'STRIPE',
        capturedAt: new Date('2026-03-29T18:10:00.000Z'),
        updatedAt: new Date('2026-03-29T18:10:00.000Z'),
        jobId: 'job_1',
      },
    ]);
    notifications.getLatestClientCommunication.mockResolvedValue({
      channel: 'EMAIL',
      type: 'CONFIRMATION',
      label: 'Confirmation email',
    });

    const result = await service.getOne({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      clientId: 'client_1',
    });

    expect(result.jobs[0].workerName).toBe('Gus Gutter, Lena Lawn');
    expect(result.tasks[0].assignedWorkerName).toBe('Gus Gutter');
    expect(result.customerComments).toBe('Please use side gate');
    expect(result.internalNotes).toBe('VIP customer');
    expect(result.lastCommunication).toEqual({
      channel: 'EMAIL',
      type: 'CONFIRMATION',
      label: 'Confirmation email',
    });
  });

  it('rejects update when the new name is blank', async () => {
    const service = makeService();

    prisma.clientProfile.findFirst.mockResolvedValue({
      id: 'client_1',
      name: 'Brandon McConnery',
      email: 'brandon@example.com',
      phone: null,
      address: null,
      internalNotes: null,
    });

    await expect(
      service.update({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
        clientId: 'client_1',
        dto: {
          name: '   ',
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects access for non-manager roles', async () => {
    const service = makeService();

    await expect(
      service.list({
        companyId: 'company_1',
        roles: ['worker'],
        userSub: 'sub_1',
        query: {} as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when a requested client is missing', async () => {
    const service = makeService();

    prisma.clientProfile.findFirst.mockResolvedValue(null);

    await expect(
      service.getOne({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        clientId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
