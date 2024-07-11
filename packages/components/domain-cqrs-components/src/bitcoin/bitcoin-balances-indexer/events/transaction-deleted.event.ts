import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionDeletedEventPayload {
  aggregateId: string;
  outputsIndexes: number[];
  status: string;
  requestId: string;
  blockHeight: string;
  blockHash: string;
}

export class BitcoinBalancesIndexerTransactionDeletedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionDeletedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionDeletedEventPayload) {}
}
