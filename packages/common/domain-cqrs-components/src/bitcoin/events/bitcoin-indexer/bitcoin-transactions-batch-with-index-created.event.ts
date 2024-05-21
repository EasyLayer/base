import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchWithIndexCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactions: any;
  blockHeight: string;
  blockHash: string;
  status: string;
  index: number;
}

export class BitcoinTransactionsBatchWithIndexCreatedEvent implements BasicEvent<BitcoinTransactionsBatchWithIndexCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchWithIndexCreatedEventPayload) {}
}
