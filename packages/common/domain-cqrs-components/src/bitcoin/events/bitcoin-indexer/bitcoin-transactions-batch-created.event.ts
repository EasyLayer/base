import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactionIds: string[];
  blockHeight: string;
  blockHash: string;
  status: string;
  index: number;
  isFinalBatch: boolean;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
