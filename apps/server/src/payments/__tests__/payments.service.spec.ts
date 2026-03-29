import { BadRequestException } from '@nestjs/common';
import {
  JobStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { PaymentsService } from '../payments.service';

describe('PaymentsService', () => {
  const originalAppPublicUrl = process.env.APP_PUBLIC_URL;

  const prisma = {
    job: {
      findFirst: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    bookingAccessLink: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const alerts = {
    createBookingReviewAlerts: jest.fn(),
  };

  const activity = {
    logPaymentSucceeded: jest.fn(),
  };

  const stripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  };

  const makeService = () =>
    new PaymentsService(
      prisma as any,
      alerts as any,
      activity as any,
      stripe as any,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    process.env.APP_PUBLIC_URL = originalAppPublicUrl;
  });

  it('creates a stripe checkout session and stores a payment record', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      balanceCents: 12500,
      currency: 'CAD',
      lineItems: [
        {
          description: 'Window cleaning',
          quantity: 1,
          unitPriceCents: 12500,
          totalCents: 12500,
        },
      ],
    });
    prisma.payment.findUnique.mockResolvedValue(null);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/cs_test_123',
    });
    prisma.payment.upsert.mockResolvedValue(undefined);

    const result = await service.createCheckoutSession('company_1', 'user_1', {
      jobId: 'job_1',
      successUrl: 'http://localhost:3000/payment/success',
      cancelUrl: 'http://localhost:3000/payment/cancel',
      idempotencyKey: 'idem_1',
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: 'job_1',
        metadata: {
          jobId: 'job_1',
          companyId: 'company_1',
        },
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({
              currency: 'cad',
            }),
          }),
        ],
      }),
      { idempotencyKey: 'idem_1' },
    );
    expect(prisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: 'idem_1' },
      }),
    );
    expect(result).toEqual({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.test/cs_test_123',
    });
  });

  it('returns an existing checkout session when the idempotency key already exists', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      balanceCents: 12500,
      currency: 'CAD',
      lineItems: [],
    });
    prisma.payment.findUnique.mockResolvedValue({
      stripeSessionId: 'cs_existing_123',
    });
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_existing_123',
      url: 'https://checkout.stripe.test/cs_existing_123',
    });

    const result = await service.createCheckoutSession('company_1', 'user_1', {
      jobId: 'job_1',
      idempotencyKey: 'idem_existing',
    });

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      sessionId: 'cs_existing_123',
      url: 'https://checkout.stripe.test/cs_existing_123',
    });
  });

  it('marks checkout sessions completed, updates the job balance, logs activity, and raises review alerts', async () => {
    const service = makeService();

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment_1',
      stripeSessionId: 'cs_test_123',
      status: PaymentStatus.REQUIRES_ACTION,
      amountCents: 12500,
      provider: PaymentProvider.STRIPE,
      companyId: 'company_1',
      jobId: 'job_1',
    });
    stripe.paymentIntents.retrieve.mockResolvedValue({
      latest_charge: {
        receipt_url: 'https://stripe.test/receipt_123',
      },
    });

    const tx = {
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      job: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job_1',
          source: 'PUBLIC',
          status: JobStatus.PENDING_CONFIRMATION,
          paidCents: 0,
          totalCents: 12500,
          clientId: 'client_1',
          client: {
            name: 'Owen Khan',
          },
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await service.markCheckoutSessionCompleted({
      id: 'cs_test_123',
      client_reference_id: 'job_1',
      metadata: {
        companyId: 'company_1',
      },
      payment_intent: 'pi_123',
      customer: 'cus_123',
    } as any);

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: expect.objectContaining({
        status: PaymentStatus.SUCCEEDED,
        stripePaymentIntentId: 'pi_123',
        stripeCustomerId: 'cus_123',
        receiptUrl: 'https://stripe.test/receipt_123',
      }),
    });
    expect(tx.job.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        paidCents: 12500,
        balanceCents: 0,
      }),
    });
    expect(activity.logPaymentSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        paymentId: 'payment_1',
        jobId: 'job_1',
        clientId: 'client_1',
      }),
    );
    expect(alerts.createBookingReviewAlerts).toHaveBeenCalledWith({
      companyId: 'company_1',
      jobId: 'job_1',
    });
  });

  it('rejects checkout creation for fully paid jobs', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      balanceCents: 0,
      currency: 'CAD',
      lineItems: [],
    });

    await expect(
      service.createCheckoutSession('company_1', 'user_1', {
        jobId: 'job_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
