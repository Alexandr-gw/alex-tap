import { UnprocessableEntityException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
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

  it('creates a public checkout, logs activities, and returns a booking access path', async () => {
    const service = makeService();
    const dto = {
      companyId: 'company_1',
      serviceId: 'service_1',
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
        start: '2026-03-28T18:00:00.000Z',
        client: { name: 'Owen Khan', email: 'owen@example.com' },
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(payments.createCheckoutSession).not.toHaveBeenCalled();
    expect(activity.logBookingSubmitted).not.toHaveBeenCalled();
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
});
