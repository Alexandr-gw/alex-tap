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
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  const bookingAccess = {
    getJobAccessPath: jest.fn(),
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
      bookingAccess as any,
      stripe as any,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    bookingAccess.getJobAccessPath.mockResolvedValue(null);
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

  it('rejects checkout redirects outside the allowlisted origins', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      balanceCents: 12500,
      currency: 'CAD',
      lineItems: [],
    });
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.createCheckoutSession('company_1', 'user_1', {
        jobId: 'job_1',
        successUrl: 'https://evil.example.com/payment/success',
      }),
    ).rejects.toThrow('Checkout redirect URL origin is not allowed');

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('marks matching payment intents as failed', async () => {
    const service = makeService();

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment_1',
    });
    prisma.payment.update.mockResolvedValue(undefined);

    await service.markPaymentFailed(
      {
        id: 'pi_123',
        metadata: {
          checkoutSessionId: 'cs_123',
        },
      } as any,
      { id: 'evt_failed' } as any,
    );

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { stripePaymentIntentId: 'pi_123' },
          { stripeSessionId: 'cs_123' },
        ],
      },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: {
        status: PaymentStatus.FAILED,
        raw: { id: 'evt_failed' },
      },
    });
  });

  it('records charge refunds and restores the job balance', async () => {
    const service = makeService();

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment_1',
      jobId: 'job_1',
      companyId: 'company_1',
    });

    const tx = {
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      job: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job_1',
          paidCents: 20000,
          totalCents: 20000,
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

    await service.markChargeRefunded(
      {
        id: 'ch_123',
        payment_intent: 'pi_123',
        amount_refunded: 5000,
      } as any,
      { id: 'evt_refund' } as any,
    );

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: expect.objectContaining({
        status: PaymentStatus.REFUNDED,
        raw: { id: 'evt_refund' },
      }),
    });
    expect(tx.job.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        paidCents: 15000,
        balanceCents: 5000,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        actorUserId: null,
        action: 'PAYMENT_REFUNDED',
        entityType: 'JOB',
        entityId: 'job_1',
        changes: {
          paymentId: 'payment_1',
          stripeChargeId: 'ch_123',
          amount: 5000,
        },
      },
    });
  });

  it('recovers a payment record from a checkout session when one does not exist yet', async () => {
    const service = makeService();

    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      balanceCents: 6000,
      totalCents: 12000,
      currency: 'CAD',
    });
    prisma.payment.create.mockResolvedValue({ id: 'payment_recovered' });

    const result = await (service as any).ensurePaymentRecordForCheckoutSession({
      id: 'cs_recovered',
      client_reference_id: 'job_1',
      metadata: {
        companyId: 'company_1',
      },
      payment_status: 'paid',
      status: 'complete',
      amount_total: 6000,
      currency: 'cad',
      payment_intent: 'pi_123',
      customer: 'cus_123',
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company_1',
        jobId: 'job_1',
        provider: PaymentProvider.STRIPE,
        amountCents: 6000,
        currency: 'CAD',
        status: PaymentStatus.PENDING,
        stripeSessionId: 'cs_recovered',
        stripePaymentIntentId: 'pi_123',
        stripeCustomerId: 'cus_123',
        metadata: {
          recoveredFromSession: true,
        },
      },
      select: { id: true },
    });
    expect(result).toBe('payment_recovered');
  });

  it('builds a public checkout summary from a Stripe session fallback', async () => {
    const service = makeService();

    prisma.job.findFirst.mockResolvedValue({
      id: 'job_1',
      companyId: 'company_1',
      source: 'PUBLIC',
      startAt: new Date('2026-03-28T15:00:00.000Z'),
      currency: 'CAD',
      client: {
        name: 'Owen Khan',
      },
      lineItems: [{ description: 'Window cleaning' }],
    });
    stripe.paymentIntents.retrieve.mockResolvedValue({
      latest_charge: {
        receipt_url: 'https://stripe.test/receipt_public',
      },
    });
    bookingAccess.getJobAccessPath.mockResolvedValue('/booking/booking_tok_123');

    const result = await (service as any).buildCheckoutSummaryFromSession(
      {
        id: 'cs_public',
        client_reference_id: 'job_1',
        metadata: {
          companyId: 'company_1',
        },
        payment_status: 'paid',
        status: 'complete',
        amount_total: 6000,
        currency: 'cad',
        payment_intent: 'pi_123',
      },
      true,
    );

    expect(result).toEqual({
      ok: true,
      status: PaymentStatus.SUCCEEDED,
      amountCents: 6000,
      currency: 'CAD',
      jobId: 'job_1',
      serviceName: 'Window cleaning',
      clientName: 'Owen Khan',
      scheduledAt: '2026-03-28T15:00:00.000Z',
      receiptUrl: 'https://stripe.test/receipt_public',
      customerMessage:
        'Payment successful. A team member will reach out to you shortly.',
      bookingAccessPath: '/booking/booking_tok_123',
    });
  });

  it('covers payment helper branches for reconciliation, session URLs, and redirect validation', async () => {
    const service = makeService();

    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.REQUIRES_ACTION,
    });
    const completeSpy = jest
      .spyOn(service as any, 'markCheckoutSessionCompleted')
      .mockResolvedValue(undefined);

    await (service as any).reconcileCheckoutSessionIfPaid('cs_paid', {
      id: 'cs_paid',
      payment_status: 'paid',
    });
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cs_paid' }),
      null,
    );

    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      id: 'cs_missing_url',
      url: null,
    });
    await expect((service as any).getSessionUrl('cs_missing_url')).rejects.toThrow(
      'Stripe session URL not available',
    );

    expect(await (service as any).getReceiptUrl(null)).toBeNull();
    expect((service as any).getCustomerMessage(PaymentStatus.FAILED)).toBe(
      'Payment failed. Please try again or contact support.',
    );
    expect(
      (service as any).getEffectivePaymentStatus(PaymentStatus.PENDING, {
        status: 'expired',
      }),
    ).toBe(PaymentStatus.FAILED);
    expect(
      (service as any).resolveCheckoutRedirectUrl(
        '/payment/success',
        'http://localhost:3000/payment/fallback',
      ),
    ).toBe('http://localhost:3000/payment/success');
    expect(() =>
      (service as any).resolveCheckoutRedirectUrl(
        '//evil.example.com/redirect',
        'http://localhost:3000/payment/fallback',
      ),
    ).toThrow('Invalid checkout redirect URL');
    expect(
      [...(service as any).getAllowedCheckoutOrigins('http://localhost:3000')],
    ).toContain('http://localhost:3000');
  });
});



