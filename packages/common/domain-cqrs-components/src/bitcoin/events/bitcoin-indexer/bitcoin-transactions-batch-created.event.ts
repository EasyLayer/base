import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactions: string[];
  blockHeight: string;
  blockHash: string;
  status: string;
  index: number;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
