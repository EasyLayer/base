import { BasicEvent } from '../base.event';

interface BitcoinTransactionsPoolCreatedEventPayload {
  aggregateId: string;
  batches: any[];
  blockId: string;
  status: string;
}

export class BitcoinTransactionsPoolCreatedEvent implements BasicEvent<BitcoinTransactionsPoolCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsPoolCreatedEventPayload) {}
}
