import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactionIds: string[];
  blockHeight: string;
  blockHash: string;
  status: string;
  index: number;
  isFinalBatch: boolean;
}

export class BitcoinIndexerTransactionsBatchCreatedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchCreatedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchCreatedEventPayload) {}
}
