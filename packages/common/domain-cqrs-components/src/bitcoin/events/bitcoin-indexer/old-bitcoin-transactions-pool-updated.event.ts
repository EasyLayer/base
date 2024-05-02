import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsPoolUpdatedEventPayload {
  aggregateId: string;
  batches: any[];
  blockId: string;
  status: string;
}

export class BitcoinTransactionsPoolUpdatedEvent implements BasicEvent<BitcoinTransactionsPoolUpdatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsPoolUpdatedEventPayload) {}
}
