import { MockPaymentGateway } from './mock-payment-gateway';

describe('MockPaymentGateway', () => {
  const gateway = new MockPaymentGateway();

  it('declines a credit card number starting with 0000', async () => {
    const result = await gateway.charge({
      amount: 20,
      method: 'CREDIT_CARD',
      details: { cardNumber: '0000 1234 5678 9012' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts any other card number and returns a transaction reference', async () => {
    const result = await gateway.charge({
      amount: 20,
      method: 'CREDIT_CARD',
      details: { cardNumber: '4242 4242 4242 4242' },
    });
    expect(result.success).toBe(true);
    expect(result.transactionRef).toMatch(/^TXN-/);
  });

  it('only applies the decline rule to credit cards', async () => {
    const result = await gateway.charge({
      amount: 20,
      method: 'PAYPAL',
      details: { cardNumber: '0000' },
    });
    expect(result.success).toBe(true);
  });

  it('never declines a zero amount (fully covered by wallet or points)', async () => {
    const result = await gateway.charge({
      amount: 0,
      method: 'CREDIT_CARD',
      details: { cardNumber: '0000000000000000' },
    });
    expect(result.success).toBe(true);
  });

  it('succeeds when no payment details are given', async () => {
    const result = await gateway.charge({ amount: 10, method: 'CREDIT_CARD' });
    expect(result.success).toBe(true);
  });
});
