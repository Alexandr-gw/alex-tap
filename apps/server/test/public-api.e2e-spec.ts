import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicBookingController } from '../src/public-booking/public-booking.controller';
import { PublicBookingService } from '../src/public-booking/public-booking.service';
import { PaymentsService } from '../src/payments/payments.service';
import { StripeWebhookController } from '../src/webhooks/stripe.webhook.controller';

describe('Public API (e2e)', () => {
  let app: INestApplication;

  const publicBookingService = {
    getPublicService: jest.fn(),
    getPublicSlots: jest.fn(),
    listPublicServices: jest.fn(),
    createPublicCheckout: jest.fn(),
    getBookingByAccessToken: jest.fn(),
    requestBookingChanges: jest.fn(),
  };

  const paymentsService = {
    getCheckoutSessionSummaryPublic: jest.fn(),
    markCheckoutSessionCompleted: jest.fn(),
    markPaymentFailed: jest.fn(),
    markChargeRefunded: jest.fn(),
  };

  const stripe = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicBookingController, StripeWebhookController],
      providers: [
        { provide: PublicBookingService, useValue: publicBookingService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: 'STRIPE', useValue: stripe },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when public slots query params are missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/slots')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('companyId must be a string');
      });
  });

  it('creates a public checkout through the public API', async () => {
    publicBookingService.createPublicCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.test/cs_test_123',
      jobId: 'job_1',
      bookingAccessPath: '/booking/booking-token',
    });

    await request(app.getHttpServer())
      .post('/api/v1/public/bookings/checkout')
      .send({
        companyId: 'company_1',
        serviceId: 'service_1',
        bookingIntentId: 'intent_1',
        start: '2026-03-28T18:00:00.000Z',
        client: {
          name: 'Owen Khan',
          email: 'owen@example.com',
        },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          checkoutUrl: 'https://checkout.stripe.test/cs_test_123',
          jobId: 'job_1',
          bookingAccessPath: '/booking/booking-token',
        });
      });

    expect(publicBookingService.createPublicCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        serviceId: 'service_1',
        bookingIntentId: 'intent_1',
        client: expect.objectContaining({
          name: 'Owen Khan',
          email: 'owen@example.com',
        }),
      }),
    );
  });

  it('rejects unknown fields on public checkout', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/bookings/checkout')
      .send({
        companyId: 'company_1',
        serviceId: 'service_1',
        bookingIntentId: 'intent_1',
        start: '2026-03-28T18:00:00.000Z',
        client: {
          name: 'Owen Khan',
        },
        hacked: true,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('property hacked should not exist');
      });
  });

  it('returns the public checkout session summary', async () => {
    paymentsService.getCheckoutSessionSummaryPublic.mockResolvedValue({
      ok: true,
      status: 'SUCCEEDED',
      amountCents: 12500,
      currency: 'CAD',
      jobId: 'job_1',
      serviceName: 'Window cleaning',
      clientName: 'Owen Khan',
      scheduledAt: '2026-03-28T18:00:00.000Z',
      bookingAccessPath: '/booking/booking-token',
    });

    await request(app.getHttpServer())
      .get('/api/v1/public/payments/checkout-session/cs_test_123')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            ok: true,
            status: 'SUCCEEDED',
            jobId: 'job_1',
          }),
        );
      });

    expect(
      paymentsService.getCheckoutSessionSummaryPublic,
    ).toHaveBeenCalledWith({
      sessionId: 'cs_test_123',
    });
  });

  it('rejects Stripe webhooks when the webhook secret is missing', async () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', 'sig_test')
      .send({ hello: 'world' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('STRIPE_WEBHOOK_SECRET is not configured');
      });

    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it('handles checkout.session.completed Stripe webhooks', async () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    const event = {
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          id: 'cs_test_123',
          client_reference_id: 'job_1',
        },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(event);

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', 'sig_test')
      .send({ id: 'evt_1' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ received: true });
      });

    expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
    expect(paymentsService.markCheckoutSessionCompleted).toHaveBeenCalledWith(
      event.data.object,
      event,
    );

    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });
});
