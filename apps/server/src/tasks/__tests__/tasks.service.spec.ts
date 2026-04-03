import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TasksService } from '../tasks.service';

describe('TasksService', () => {
  const prisma = {
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    taskAssignment: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    clientProfile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    worker: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const activity = {
    logTaskCreated: jest.fn(),
    logTaskCompleted: jest.fn(),
  };

  const makeService = () => new TasksService(prisma as any, activity as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists tasks for managers with mapped assignees', async () => {
    const service = makeService();

    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task_1',
        companyId: 'company_1',
        subject: 'Follow up with client',
        description: 'Call before arrival',
        startAt: new Date('2026-04-01T15:00:00.000Z'),
        endAt: new Date('2026-04-01T15:30:00.000Z'),
        completed: false,
        customerId: 'client_1',
        customer: {
          id: 'client_1',
          name: 'Brandon McConnery',
          address: '123 Main St',
        },
        assignments: [
          {
            worker: {
              id: 'worker_2',
              displayName: 'Lena Lawn',
            },
          },
          {
            worker: {
              id: 'worker_1',
              displayName: 'Gus Gutter',
            },
          },
        ],
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-01T11:00:00.000Z'),
      },
    ]);

    const result = await service.list({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      query: { completed: false } as any,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company_1',
          completed: false,
        }),
      }),
    );
    expect(result.items[0]).toEqual({
      id: 'task_1',
      companyId: 'company_1',
      subject: 'Follow up with client',
      description: 'Call before arrival',
      startAt: '2026-04-01T15:00:00.000Z',
      endAt: '2026-04-01T15:30:00.000Z',
      completed: false,
      customerId: 'client_1',
      customerName: 'Brandon McConnery',
      customerAddress: '123 Main St',
      assigneeIds: ['worker_1', 'worker_2'],
      assignees: [
        { id: 'worker_1', name: 'Gus Gutter' },
        { id: 'worker_2', name: 'Lena Lawn' },
      ],
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T11:00:00.000Z',
    });
  });

  it('restricts workers to their own assigned tasks', async () => {
    const service = makeService();

    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_7' });
    prisma.task.findMany.mockResolvedValue([]);

    await service.list({
      companyId: 'company_1',
      roles: ['worker'],
      userSub: 'worker_sub',
      query: {} as any,
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignments: {
            some: {
              workerId: 'worker_7',
            },
          },
        }),
      }),
    );
  });

  it('creates a task, normalizes fields, and logs activity', async () => {
    const service = makeService();

    prisma.user.findUnique.mockResolvedValue({
      name: 'Mina Manager',
      email: 'mina@example.com',
    });
    prisma.clientProfile.findFirst.mockResolvedValue({ id: 'client_1' });
    prisma.worker.findMany.mockResolvedValue([{ id: 'worker_1' }, { id: 'worker_2' }]);

    const createdTask = {
      id: 'task_1',
      companyId: 'company_1',
      subject: 'Call customer',
      description: 'Before arrival',
      startAt: new Date('2026-04-01T15:00:00.000Z'),
      endAt: new Date('2026-04-01T15:30:00.000Z'),
      completed: false,
      customerId: 'client_1',
      customer: {
        id: 'client_1',
        name: 'Brandon McConnery',
        address: '123 Main St',
      },
      assignments: [
        { worker: { id: 'worker_1', displayName: 'Gus Gutter' } },
        { worker: { id: 'worker_2', displayName: 'Lena Lawn' } },
      ],
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        task: {
          create: jest.fn().mockResolvedValue({
            id: 'task_1',
            companyId: 'company_1',
            subject: 'Call customer',
            description: 'Before arrival',
            startAt: new Date('2026-04-01T15:00:00.000Z'),
            endAt: new Date('2026-04-01T15:30:00.000Z'),
            completed: false,
            customerId: 'client_1',
          }),
          findFirst: jest.fn().mockResolvedValue(createdTask),
        },
        taskAssignment: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      }),
    );

    const result = await service.create({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      dto: {
        subject: ' Call customer ',
        description: ' Before arrival ',
        startAt: '2026-04-01T15:00:00.000Z',
        endAt: '2026-04-01T15:30:00.000Z',
        customerId: 'client_1',
        assigneeIds: ['worker_1', 'worker_2'],
      } as any,
    });

    expect(activity.logTaskCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        taskId: 'task_1',
        clientId: 'client_1',
        actorLabel: 'Mina Manager',
        message: 'Call customer task was created by Mina Manager.',
      }),
    );
    expect(result.assigneeIds).toEqual(['worker_1', 'worker_2']);
  });

  it('logs completion when a task is marked complete', async () => {
    const service = makeService();

    prisma.user.findUnique.mockResolvedValue({
      name: 'Mina Manager',
      email: 'mina@example.com',
    });

    const existingTask = {
      id: 'task_1',
      companyId: 'company_1',
      subject: 'Call customer',
      description: null,
      startAt: new Date('2026-04-01T15:00:00.000Z'),
      endAt: new Date('2026-04-01T15:30:00.000Z'),
      completed: false,
      customerId: 'client_1',
      customer: {
        id: 'client_1',
        name: 'Brandon McConnery',
        address: '123 Main St',
      },
      assignments: [{ worker: { id: 'worker_1', displayName: 'Gus Gutter' } }],
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    };

    const updatedTask = {
      ...existingTask,
      completed: true,
      updatedAt: new Date('2026-04-01T11:00:00.000Z'),
    };

    prisma.task.findFirst.mockResolvedValueOnce(existingTask);
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        task: {
          update: jest.fn().mockResolvedValue(undefined),
          findFirst: jest.fn().mockResolvedValue(updatedTask),
        },
        taskAssignment: {
          deleteMany: jest.fn().mockResolvedValue(undefined),
          createMany: jest.fn().mockResolvedValue(undefined),
        },
      }),
    );

    const result = await service.update({
      companyId: 'company_1',
      roles: ['manager'],
      userSub: 'sub_1',
      taskId: 'task_1',
      dto: { completed: true } as any,
    });

    expect(activity.logTaskCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        taskId: 'task_1',
        clientId: 'client_1',
        actorLabel: 'Mina Manager',
      }),
    );
    expect(result.completed).toBe(true);
  });

  it('rejects invalid task ranges', async () => {
    const service = makeService();

    await expect(
      service.create({
        companyId: 'company_1',
        roles: ['admin'],
        userSub: 'sub_1',
        dto: {
          subject: 'Bad task',
          startAt: '2026-04-01T15:30:00.000Z',
          endAt: '2026-04-01T15:00:00.000Z',
        } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing tasks on delete', async () => {
    const service = makeService();

    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.remove({
        companyId: 'company_1',
        roles: ['manager'],
        userSub: 'sub_1',
        taskId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids non-manager task creation', async () => {
    const service = makeService();

    prisma.worker.findFirst.mockResolvedValue({ id: 'worker_1' });

    await expect(
      service.create({
        companyId: 'company_1',
        roles: ['worker'],
        userSub: 'worker_sub',
        dto: {
          subject: 'Blocked task',
          startAt: '2026-04-01T15:00:00.000Z',
          endAt: '2026-04-01T15:30:00.000Z',
        } as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
