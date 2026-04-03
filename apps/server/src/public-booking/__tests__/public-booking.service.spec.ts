import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PublicBookingService } from '../public-booking.service';

describe('PublicBookingService', () => {
  const originalNotifyFromEmail = process.env.NOTIFY_FROM_EMAIL;
  const originalAppPublicUrl = process.env.APP_PUBLIC_URL;

  const prisma = {
    company: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    bookingAccessLink: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const slots = {
    isCompanySlotBookable: jest.fn(),
    getCompanySlotsForDay: jest.fn(),
  };

  const payments = {
    createCheckoutSession: jest.fn(),
  };

  const activity = {
    logClientCreated: jest.fn(),
    logBookingSubmitted: jest.fn(),
  };

  const alerts = {
    createBookingReviewAlerts: jest.fn(),
  };

  const audit = {
    record: jest.fn(),
  };

  const emailProvider = {
    sendEmail: jest.fn(),
  };

  const makeService = () =>
    new PublicBookingService(
      prisma as any,
      slots as any,
      payments as any,
      activity as any,
      alerts as any,
      audit as any,
      emailProvider as any,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    process.env.NOTIFY_FROM_EMAIL = 'team@example.com';
  });

  afterAll(() => {
    process.env.NOTIFY_FROM_EMAIL = originalNotifyFromEmail;
    process.env.APP_PUBLIC_URL = originalAppPublicUrl;
  });

  it('returns a public service by company slug and service slug', async () => {
    const service = makeService();

    prisma.company.findFirst.mockResolvedValue({
      id: 'company_1',
      name: 'Alex Tap',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'service_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
      companyId: 'company_1',
    });

    await expect(
      service.getPublicService('alex-tap', 'window-cleaning'),
    ).resolves.toEqual({
      companyId: 'company_1',
      companyName: 'Alex Tap',
      serviceId: 'service_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });
  });

  it('lists filtered public slots across days and validates the requested range', async () => {
    const service = makeService();

    prisma.company.findUnique.mockResolvedValue({
      timezone: 'America/Edmonton',
    });
    slots.getCompanySlotsForDay
      .mockResolvedValueOnce({
        slots: [
          {
            start: '2026-03-28T18:00:00.000Z',
            end: '2026-03-28T19:00:00.000Z',
          },
          {
            start: '2026-03-28T16:00:00.000Z',
            end: '2026-03-28T17:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        slots: [
          {
            start: '2026-03-29T18:00:00.000Z',
            end: '2026-03-29T19:00:00.000Z',
          },
        ],
      });

    const result = await service.getPublicSlots({
      companyId: 'company_1',
      serviceId: 'service_1',
      from: '2026-03-28T17:00:00.000Z',
      to: '2026-03-29T18:30:00.000Z',
    });

    expect(slots.getCompanySlotsForDay).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        start: '2026-03-28T18:00:00.000Z',
        end: '2026-03-28T19:00:00.000Z',
      },
    ]);

    await expect(
      service.getPublicSlots({
        companyId: 'company_1',
        serviceId: 'service_1',
        from: 'bad-date',
        to: '2026-03-29T18:30:00.000Z',
      }),
    ).rejects.toThrow('Invalid from/to');
  });

  it('creates a public checkout, logs activities, and returns a booking access path', async () => {
    const service = makeService();
    const dto = {
      companyId: 'company_1',
      serviceId: 'service_1',
      bookingIntentId: 'intent_1',
      start: '2026-03-28T18:00:00.000Z',
      client: {
        name: 'Owen Khan',
        email: 'owen@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: 'Leave gate unlocked',
      },
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    };

    prisma.company.findUnique.mockResolvedValue({
      id: 'company_1',
      timezone: 'America/Edmonton',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'client_1' }),
        update: jest.fn(),
      },
      job: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'job_1' }),
      },
      jobLineItem: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    slots.isCompanySlotBookable.mockResolvedValue(true);
    payments.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/session_123',
    });
    prisma.bookingAccessLink.findUnique.mockResolvedValue(null);
    prisma.bookingAccessLink.upsert.mockResolvedValue({
      token: 'booking-token',
      expiresAt: null,
    });

    const result = await service.createPublicCheckout(dto as any);

    expect(slots.isCompanySlotBookable).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        serviceId: 'service_1',
      }),
      tx,
    );
    expect(payments.createCheckoutSession).toHaveBeenCalledWith(
      'company_1',
      'public',
      expect.objectContaining({
        jobId: 'job_1',
        idempotencyKey: expect.stringMatching(/^public:intent:/),
      }),
    );
    expect(activity.logClientCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        clientId: 'client_1',
        actorType: 'PUBLIC',
      }),
    );
    expect(activity.logBookingSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        jobId: 'job_1',
        clientId: 'client_1',
      }),
    );
    expect(result).toEqual({
      checkoutUrl: 'https://checkout.stripe.test/session_123',
      jobId: 'job_1',
      bookingAccessPath: '/booking/booking-token',
    });
  });

  it('rejects public checkout when the selected slot is no longer available', async () => {
    const service = makeService();

    prisma.company.findUnique.mockResolvedValue({
      id: 'company_1',
      timezone: 'America/Edmonton',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      clientProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      job: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      jobLineItem: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    slots.isCompanySlotBookable.mockResolvedValue(false);

    await expect(
      service.createPublicCheckout({
        companyId: 'company_1',
        serviceId: 'service_1',
        bookingIntentId: 'intent_1',
        start: '2026-03-28T18:00:00.000Z',
        client: { name: 'Owen Khan', email: 'owen@example.com' },
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(payments.createCheckoutSession).not.toHaveBeenCalled();
    expect(activity.logBookingSubmitted).not.toHaveBeenCalled();
  });

  it('updates an existing public booking intent when it has not been paid yet', async () => {
    const service = makeService();

    prisma.company.findUnique.mockResolvedValue({
      id: 'company_1',
      timezone: 'America/Edmonton',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'client_1' }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
      job: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'job_1',
          clientId: 'client_old',
          paidCents: 0,
          status: JobStatus.PENDING_CONFIRMATION,
          payments: [{ status: 'REQUIRES_ACTION' }],
          lineItems: [{ id: 'line_1' }, { id: 'line_2' }],
        }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      },
      jobLineItem: {
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    slots.isCompanySlotBookable.mockResolvedValue(true);
    payments.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/session_existing',
    });
    prisma.bookingAccessLink.findUnique.mockResolvedValue({
      token: 'existing-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await service.createPublicCheckout({
      companyId: 'company_1',
      serviceId: 'service_1',
      bookingIntentId: 'intent_1',
      start: '2026-03-28T18:00:00.000Z',
      client: {
        name: 'Owen Khan',
        email: 'owen@example.com',
        phone: '555-1234',
        address: '123 Main St',
      },
    } as any);

    expect(tx.clientProfile.update).toHaveBeenCalledWith({
      where: { id: 'client_1' },
      data: {
        name: 'Owen Khan',
        phone: '555-1234',
        address: '123 Main St',
        notes: undefined,
      },
    });
    expect(tx.job.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        clientId: 'client_1',
        status: JobStatus.PENDING_CONFIRMATION,
        paidCents: 0,
        balanceCents: 12500,
      }),
    });
    expect(tx.jobLineItem.update).toHaveBeenCalledWith({
      where: { id: 'line_1' },
      data: expect.objectContaining({
        serviceId: 'service_1',
        description: 'Window cleaning',
      }),
    });
    expect(tx.jobLineItem.deleteMany).toHaveBeenCalledWith({
      where: {
        jobId: 'job_1',
        id: { not: 'line_1' },
      },
    });
    expect(result).toEqual({
      checkoutUrl: 'https://checkout.stripe.test/session_existing',
      jobId: 'job_1',
      bookingAccessPath: '/booking/existing-token',
    });
  });

  it('rejects resubmitting a public booking intent that already has a successful payment', async () => {
    const service = makeService();

    prisma.company.findUnique.mockResolvedValue({
      id: 'company_1',
      timezone: 'America/Edmonton',
    });
    prisma.service.findFirst.mockResolvedValue({
      id: 'service_1',
      companyId: 'company_1',
      name: 'Window cleaning',
      durationMins: 60,
      basePriceCents: 12500,
      currency: 'CAD',
    });

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      clientProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'client_1' }),
        update: jest.fn(),
      },
      job: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'job_1',
          clientId: 'client_1',
          paidCents: 12500,
          status: JobStatus.PENDING_CONFIRMATION,
          payments: [{ status: 'SUCCEEDED' }],
          lineItems: [{ id: 'line_1' }],
        }),
        create: jest.fn(),
      },
      jobLineItem: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    slots.isCompanySlotBookable.mockResolvedValue(true);

    await expect(
      service.createPublicCheckout({
        companyId: 'company_1',
        serviceId: 'service_1',
        bookingIntentId: 'intent_1',
        start: '2026-03-28T18:00:00.000Z',
        client: {
          name: 'Owen Khan',
          email: 'owen@example.com',
        },
      } as any),
    ).rejects.toThrow('This booking has already been submitted.');
  });

  it('records booking change requests with a customer note even when email notifications are unavailable', async () => {
    const service = makeService();
    process.env.NOTIFY_FROM_EMAIL = '';

    prisma.bookingAccessLink.findUnique.mockResolvedValue({
      token: 'booking-token',
      companyId: 'company_1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      company: {
        id: 'company_1',
        name: 'Alex Tap',
        timezone: 'America/Edmonton',
      },
      job: {
        id: 'job_1',
        clientId: 'client_1',
        source: 'PUBLIC',
        title: 'Window cleaning',
        startAt: new Date('2026-03-28T18:00:00.000Z'),
        endAt: new Date('2026-03-28T19:00:00.000Z'),
        status: JobStatus.PENDING_CONFIRMATION,
        client: {
          id: 'client_1',
          name: 'Owen Khan',
          email: 'owen@example.com',
          address: '123 Main St',
          notes: 'Leave gate unlocked',
        },
        worker: null,
        lineItems: [{ description: 'Window cleaning' }],
      },
    });

    const result = await service.requestBookingChanges('booking-token', {
      message: 'Please call me to move this to the afternoon.',
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        entityType: 'BOOKING_ACCESS',
        entityId: 'job_1',
        action: 'BOOKING_CHANGE_REQUESTED',
      }),
    );
    expect(alerts.createBookingReviewAlerts).toHaveBeenCalledWith({
      companyId: 'company_1',
      jobId: 'job_1',
      reason: 'CHANGE_REQUEST',
      customerMessage: 'Please call me to move this to the afternoon.',
    });
    expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      message:
        'Your request was recorded and the team will reach out shortly.',
    });
  });

  it('lists public services and returns booking details by access token', async () => {
    const service = makeService();

    prisma.company.findFirst
      .mockResolvedValueOnce({
        id: 'company_1',
        name: 'Alex Tap',
      })
      .mockResolvedValueOnce({
        id: 'company_1',
        name: 'Alex Tap',
      });
    prisma.service.findMany.mockResolvedValue([
      {
        id: 'service_1',
        name: 'Window cleaning',
        slug: 'window-cleaning',
        durationMins: 60,
        basePriceCents: 12500,
        currency: 'CAD',
      },
    ]);
    prisma.bookingAccessLink.findUnique.mockResolvedValue({
      token: 'booking-token',
      companyId: 'company_1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      company: {
        id: 'company_1',
        name: 'Alex Tap',
        timezone: 'America/Edmonton',
      },
      job: {
        id: 'job_1',
        source: 'PUBLIC',
        title: 'Window cleaning',
        startAt: new Date('2026-03-28T18:00:00.000Z'),
        endAt: new Date('2026-03-28T19:00:00.000Z'),
        status: JobStatus.PENDING_CONFIRMATION,
        totalCents: 12500,
        currency: 'CAD',
        location: '123 Main St',
        clientId: 'client_1',
        client: {
          id: 'client_1',
          name: 'Owen Khan',
          email: 'owen@example.com',
          address: '123 Main St',
          notes: 'Leave gate unlocked',
        },
        worker: {
          displayName: 'Lena',
        },
        lineItems: [{ description: 'Window cleaning' }],
      },
    });
    prisma.payment.findFirst.mockResolvedValue({
      status: 'REQUIRES_ACTION',
      amountCents: 12500,
      currency: 'CAD',
    });

    await expect(service.listPublicServices('alex-tap')).resolves.toEqual({
      companyId: 'company_1',
      companyName: 'Alex Tap',
      services: [
        {
          id: 'service_1',
          name: 'Window cleaning',
          slug: 'window-cleaning',
          durationMins: 60,
          basePriceCents: 12500,
          currency: 'CAD',
        },
      ],
    });

    await expect(service.getBookingByAccessToken('booking-token')).resolves.toEqual({
      booking: {
        token: 'booking-token',
        companyName: 'Alex Tap',
        jobId: 'job_1',
        status: JobStatus.PENDING_CONFIRMATION,
        title: 'Window cleaning',
        serviceName: 'Window cleaning',
        scheduledAt: '2026-03-28T18:00:00.000Z',
        endsAt: '2026-03-28T19:00:00.000Z',
        timezone: 'America/Edmonton',
        clientName: 'Owen Khan',
        clientEmail: 'owen@example.com',
        location: '123 Main St',
        workerName: 'Lena',
        totalCents: 12500,
        currency: 'CAD',
        notes: 'Leave gate unlocked',
        paymentStatus: 'REQUIRES_ACTION',
        paymentAmountCents: 12500,
        requestChangesEmail: 'team@example.com',
        expiresAt: expect.any(String),
      },
    });
  });

  it('reuses a valid booking access link and refreshes expired ones', async () => {
    const service = makeService();

    prisma.bookingAccessLink.findUnique
      .mockResolvedValueOnce({
        token: 'existing-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      .mockResolvedValueOnce({
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 1000),
      });
    prisma.bookingAccessLink.upsert.mockResolvedValue({
      token: 'new-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      service.ensureBookingAccessLink('company_1', 'job_1'),
    ).resolves.toEqual({
      token: 'existing-token',
      expiresAt: expect.any(Date),
    });

    await expect(
      service.ensureBookingAccessLink('company_1', 'job_2'),
    ).resolves.toEqual({
      token: 'new-token',
      expiresAt: expect.any(Date),
    });
  });

  it('covers booking lookup, email delivery, and retry helpers', async () => {
    const service = makeService();

    prisma.bookingAccessLink.findUnique.mockResolvedValueOnce(null);
    await expect(
      (service as any).findBookingAccessLink('missing-token'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.bookingAccessLink.findUnique.mockResolvedValueOnce({
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 60 * 1000),
      company: { id: 'company_1', name: 'Alex Tap', timezone: 'America/Edmonton' },
      job: {
        id: 'job_1',
        source: 'PUBLIC',
        clientId: 'client_1',
        client: {
          id: 'client_1',
          name: 'Owen Khan',
          email: 'owen@example.com',
          address: '123 Main St',
          notes: null,
        },
        worker: null,
        lineItems: [{ description: 'Window cleaning' }],
        title: 'Window cleaning',
        startAt: new Date('2026-03-28T18:00:00.000Z'),
        endAt: new Date('2026-03-28T19:00:00.000Z'),
        status: JobStatus.PENDING_CONFIRMATION,
        totalCents: 12500,
        currency: 'CAD',
        location: null,
      },
    });
    await expect(
      (service as any).findBookingAccessLink('expired-token'),
    ).rejects.toThrow('Booking link has expired');

    emailProvider.sendEmail.mockResolvedValue({ ok: true });
    await expect(
      (service as any).sendBookingChangeRequestEmail({
        companyName: 'Alex Tap',
        clientName: 'Owen Khan',
        clientEmail: 'owen@example.com',
        jobId: 'job_1',
        serviceName: 'Window cleaning',
        scheduledAt: new Date('2026-03-28T18:00:00.000Z'),
        timezone: 'America/Edmonton',
        accessUrl: 'http://localhost:3000/booking/token',
        customerMessage: 'Please move this to the afternoon',
      }),
    ).resolves.toBe(true);

    const retryableError = Object.assign(new Error('retry me'), { code: 'P2034' });
    Object.setPrototypeOf(
      retryableError,
      Prisma.PrismaClientKnownRequestError.prototype,
    );

    const operation = jest
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('ok');

    await expect((service as any).withSerializableRetry(operation, 2)).resolves.toBe(
      'ok',
    );
    expect((service as any).isRetryableTransactionError(retryableError)).toBe(
      true,
    );
  });
});
