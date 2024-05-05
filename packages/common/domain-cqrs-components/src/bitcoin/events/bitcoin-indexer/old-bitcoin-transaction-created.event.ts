import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionCreatedEventPayload {
  aggregateId: string;
  transaction: any;
  blockId: string;
  requestId: string;
}

export class BitcoinTransactionCreatedEvent implements BasicEvent<BitcoinTransactionCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionCreatedEventPayload) {}
}
