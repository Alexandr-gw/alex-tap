import { BadRequestException } from '@nestjs/common';
import { StripeWebhookController } from '../stripe.webhook.controller';

describe('StripeWebhookController', () => {
  const originalEnv = process.env;
  const stripe = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  const paymentsService = {
    markCheckoutSessionCompleted: jest.fn(),
    markPaymentFailed: jest.fn(),
    markChargeRefunded: jest.fn(),
  };

  const makeController = () =>
    new StripeWebhookController(stripe as any, paymentsService as any);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
      STRIPE_SECRET_KEY: 'sk_test_123',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects webhook requests when the webhook secret is missing', async () => {
    const controller = makeController();
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await expect(
      controller.handle({ rawBody: Buffer.from('{}') } as any, 'sig_123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects requests with an invalid Stripe signature', async () => {
    const controller = makeController();
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('signature mismatch');
    });

    await expect(
      controller.handle({ rawBody: Buffer.from('{}') } as any, 'sig_123'),
    ).rejects.toThrow('Invalid signature: signature mismatch');
  });

  it('falls back to serializing req.body when rawBody is unavailable', async () => {
    const controller = makeController();
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.created',
      data: { object: { id: 'cus_123' } },
      livemode: false,
    });

    const result = await controller.handle({
      body: { id: 'body_payload', ok: true },
    } as any, 'sig_123');

    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify({ id: 'body_payload', ok: true })),
      'sig_123',
      'whsec_123',
    );
    expect(result).toEqual({ received: true });
  });

  it('ignores events when the livemode flag does not match the configured key type', async () => {
    const controller = makeController();
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_123' } },
      livemode: true,
    });

    const result = await controller.handle({
      rawBody: Buffer.from('{}'),
    } as any, 'sig_123');

    expect(result).toEqual({ ok: true });
    expect(paymentsService.markCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it.each([
    ['checkout.session.completed', 'markCheckoutSessionCompleted'],
    ['checkout.session.async_payment_succeeded', 'markCheckoutSessionCompleted'],
    ['payment_intent.payment_failed', 'markPaymentFailed'],
    ['charge.refunded', 'markChargeRefunded'],
    ['charge.refund.updated', 'markChargeRefunded'],
  ])('handles %s events with the matching payments service method', async (type, methodName) => {
    const controller = makeController();
    const event = {
      type,
      livemode: false,
      data: {
        object: { id: `${type}_object` },
      },
    };
    stripe.webhooks.constructEvent.mockReturnValue(event);

    const result = await controller.handle({
      rawBody: Buffer.from('{}'),
    } as any, 'sig_123');

    expect(paymentsService[methodName as keyof typeof paymentsService]).toHaveBeenCalledWith(
      event.data.object,
      event,
    );
    expect(result).toEqual({ received: true });
  });

  it('acknowledges unhandled events without calling the payments service', async () => {
    const controller = makeController();
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_method.attached',
      livemode: false,
      data: {
        object: { id: 'pm_123' },
      },
    });

    const result = await controller.handle({
      rawBody: Buffer.from('{}'),
    } as any, 'sig_123');

    expect(paymentsService.markCheckoutSessionCompleted).not.toHaveBeenCalled();
    expect(paymentsService.markPaymentFailed).not.toHaveBeenCalled();
    expect(paymentsService.markChargeRefunded).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });
});
