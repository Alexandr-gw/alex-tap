import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertStatus, AlertType, Role } from '@prisma/client';
import { AlertsService } from '../alerts.service';

describe('AlertsService', () => {
  const prisma = {
    membership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    alert: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    job: {
      findFirst: jest.fn(),
    },
    worker: {
      findMany: jest.fn(),
    },
  };

  const makeService = () => new AlertsService(prisma as any);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership_1',
      role: Role.MANAGER,
      userId: 'user_1',
    });
  });

  it('returns unread alert count for managers', async () => {
    const service = makeService();
    prisma.alert.count.mockResolvedValue(4);

    const result = await service.getUnreadCount({
      companyId: 'company_1',
      userSub: 'sub_1',
    });

    expect(prisma.alert.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company_1',
        membershipId: 'membership_1',
        status: AlertStatus.OPEN,
        readAt: null,
      },
    });
    expect(result).toEqual({ ok: true, count: 4 });
  });

  it('maps booking review alerts into list items', async () => {
    const service = makeService();

    prisma.alert.findMany.mockResolvedValue([
      {
        id: 'alert_1',
        type: AlertType.BOOKING_REVIEW,
        status: AlertStatus.OPEN,
        title: 'Booking pending confirmation',
        message: 'Brandon booked Deep Move-Out Cleaning with Gus Gutter.',
        readAt: null,
        resolvedAt: null,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        job: {
          id: 'job_1',
          status: 'SCHEDULED',
          startAt: new Date('2026-04-02T15:45:00.000Z'),
          endAt: new Date('2026-04-02T18:00:00.000Z'),
          paidAt: new Date('2026-04-01T10:05:00.000Z'),
          totalCents: 32500,
          balanceCents: 0,
          currency: 'CAD',
          client: {
            name: 'Brandon McConnery',
            email: 'brandon@example.com',
          },
          worker: {
            id: 'worker_1',
            displayName: 'Gus Gutter',
          },
          lineItems: [{ description: 'Deep Move-Out Cleaning' }],
          payments: [
            {
              id: 'payment_1',
              status: 'SUCCEEDED',
              amountCents: 32500,
              receiptUrl: 'https://example.com/receipt',
              createdAt: new Date('2026-04-01T10:05:00.000Z'),
            },
          ],
        },
      },
    ]);

    const result = await service.listForUser({
      companyId: 'company_1',
      userSub: 'sub_1',
      status: AlertStatus.OPEN,
    });

    expect(result.items[0]).toEqual({
      id: 'alert_1',
      type: AlertType.BOOKING_REVIEW,
      status: AlertStatus.OPEN,
      title: 'Booking pending confirmation',
      message: 'Brandon booked Deep Move-Out Cleaning with Gus Gutter.',
      readAt: null,
      resolvedAt: null,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      job: {
        id: 'job_1',
        status: 'SCHEDULED',
        startAt: new Date('2026-04-02T15:45:00.000Z'),
        endAt: new Date('2026-04-02T18:00:00.000Z'),
        paidAt: new Date('2026-04-01T10:05:00.000Z'),
        totalCents: 32500,
        balanceCents: 0,
        currency: 'CAD',
        clientName: 'Brandon McConnery',
        clientEmail: 'brandon@example.com',
        workerName: 'Gus Gutter',
        serviceName: 'Deep Move-Out Cleaning',
        paymentStatus: 'SUCCEEDED',
      },
    });
  });

  it('returns detailed booking review data with merged worker ids', async () => {
    const service = makeService();

    prisma.alert.findFirst.mockResolvedValue({
      id: 'alert_1',
      type: AlertType.BOOKING_REVIEW,
      status: AlertStatus.OPEN,
      title: 'Customer requested changes',
      message: 'Reach out to Brandon.',
      readAt: null,
      resolvedAt: null,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      resolvedBy: {
        id: 'user_2',
        name: 'Mina Manager',
        email: 'mina@example.com',
      },
      job: {
        id: 'job_1',
        status: 'SCHEDULED',
        startAt: new Date('2026-04-02T15:45:00.000Z'),
        endAt: new Date('2026-04-02T18:00:00.000Z'),
        paidAt: null,
        totalCents: 32500,
        balanceCents: 32500,
        currency: 'CAD',
        location: '123 Main St',
        source: 'PUBLIC',
        client: {
          id: 'client_1',
          name: 'Brandon McConnery',
          email: 'brandon@example.com',
          phone: '780-111-2222',
          address: '123 Main St',
          notes: 'Please call first',
        },
        worker: {
          id: 'worker_1',
          displayName: 'Gus Gutter',
          colorTag: 'green',
          phone: '780-333-4444',
        },
        assignments: [
          {
            worker: {
              id: 'worker_2',
              displayName: 'Lena Lawn',
              colorTag: 'blue',
              phone: '780-555-6666',
            },
          },
        ],
        lineItems: [
          {
            id: 'line_1',
            description: 'Deep Move-Out Cleaning',
            quantity: 1,
            totalCents: 32500,
            serviceId: 'service_1',
            service: {
              id: 'service_1',
              durationMins: 240,
              name: 'Deep Move-Out Cleaning',
            },
          },
        ],
        payments: [
          {
            id: 'payment_1',
            status: 'SUCCEEDED',
            amountCents: 32500,
            currency: 'CAD',
            receiptUrl: 'https://example.com/receipt',
            createdAt: new Date('2026-04-01T10:05:00.000Z'),
          },
        ],
      },
    });
    prisma.worker.findMany.mockResolvedValue([
      {
        id: 'worker_1',
        displayName: 'Gus Gutter',
        colorTag: 'green',
        phone: '780-333-4444',
      },
      {
        id: 'worker_2',
        displayName: 'Lena Lawn',
        colorTag: 'blue',
        phone: '780-555-6666',
      },
    ]);

    const result = await service.getOneForUser({
      companyId: 'company_1',
      userSub: 'sub_1',
      alertId: 'alert_1',
    });

    expect(result.job.workerIds).toEqual(['worker_1', 'worker_2']);
    expect(result.job.lineItems[0]).toEqual({
      id: 'line_1',
      description: 'Deep Move-Out Cleaning',
      quantity: 1,
      totalCents: 32500,
      serviceId: 'service_1',
      serviceName: 'Deep Move-Out Cleaning',
      serviceDurationMins: 240,
    });
    expect(result.workers).toHaveLength(2);
  });

  it('marks alerts as read once', async () => {
    const service = makeService();

    prisma.alert.findFirst.mockResolvedValue({
      id: 'alert_1',
      readAt: null,
    });

    const result = await service.markRead({
      companyId: 'company_1',
      userSub: 'sub_1',
      alertId: 'alert_1',
    });

    expect(prisma.alert.update).toHaveBeenCalledWith({
      where: { id: 'alert_1' },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toEqual({ ok: true });
  });

  it('creates change-request booking review alerts with customer context', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      startAt: new Date('2026-04-02T15:45:00.000Z'),
      client: {
        name: 'Brandon McConnery',
      },
      worker: {
        displayName: 'Gus Gutter',
      },
      lineItems: [{ description: 'Deep Move-Out Cleaning' }],
    });
    prisma.membership.findMany.mockResolvedValue([
      { id: 'membership_1' },
      { id: 'membership_2' },
    ]);
    prisma.alert.upsert.mockResolvedValue(undefined);

    const result = await service.createBookingReviewAlerts({
      companyId: 'company_1',
      jobId: 'job_1',
      reason: 'CHANGE_REQUEST',
      customerMessage: 'Please call me before arrival',
    });

    expect(prisma.alert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          title: 'Customer requested changes',
          payload: expect.objectContaining({
            reason: 'CHANGE_REQUEST',
            customerMessage: 'Please call me before arrival',
          }),
        }),
        update: expect.objectContaining({
          title: 'Customer requested changes',
          readAt: null,
          resolvedAt: null,
        }),
      }),
    );
    expect(result).toEqual({ ok: true, count: 2 });
  });

  it('resolves open booking review alerts', async () => {
    const service = makeService();
    prisma.alert.updateMany.mockResolvedValue({ count: 2 });

    await service.resolveBookingReviewAlerts({
      companyId: 'company_1',
      jobId: 'job_1',
      resolvedByUserId: 'user_1',
    });

    expect(prisma.alert.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company_1',
        jobId: 'job_1',
        type: AlertType.BOOKING_REVIEW,
        status: AlertStatus.OPEN,
      },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: expect.any(Date),
        resolvedByUserId: 'user_1',
      },
    });
  });

  it('forbids non-manager memberships from reading alerts', async () => {
    const service = makeService();
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership_1',
      role: Role.WORKER,
      userId: 'user_1',
    });

    await expect(
      service.getUnreadCount({
        companyId: 'company_1',
        userSub: 'sub_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when the requested alert is missing', async () => {
    const service = makeService();
    prisma.alert.findFirst.mockResolvedValue(null);

    await expect(
      service.getOneForUser({
        companyId: 'company_1',
        userSub: 'sub_1',
        alertId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
