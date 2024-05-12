import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactions: Map<string, any>;
  blockHeight: string;
  blockHash: string;
  status: string;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
