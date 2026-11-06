import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentDetailsDto } from '../../common/dto/process-order.dto';

export interface ChargeRequest {
  amount: number;
  method: string;
  details?: PaymentDetailsDto;
}

export interface ChargeResult {
  success: boolean;
  transactionRef: string;
}

/** Card numbers starting with this prefix are declined by the mock gateway. */
export const DECLINED_CARD_PREFIX = '0000';

/**
 * Stand-in for an external payment provider. It never stores or logs payment details:
 * a card number starting with "0000" is declined, everything else succeeds.
 */
@Injectable()
export class MockPaymentGateway {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const cardNumber = (request.details?.cardNumber ?? '').replace(/\s+/g, '');
    // Nothing to charge (fully covered by wallet or gift points): nothing to decline.
    const declined =
      request.amount > 0 && request.method === 'CREDIT_CARD' && cardNumber.startsWith(DECLINED_CARD_PREFIX);
    return { success: !declined, transactionRef: `TXN-${randomUUID()}` };
  }
}
