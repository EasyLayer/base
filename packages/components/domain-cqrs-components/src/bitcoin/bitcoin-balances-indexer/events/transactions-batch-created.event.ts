import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  transactionIds: string[];
  blockHeight: string;
  blockHash: string;
  status: string;
  index: number;
  isFinalBatch: boolean;
}

export class BitcoinBalancesIndexerTransactionsBatchCreatedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionsBatchCreatedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionsBatchCreatedEventPayload) {}
}
