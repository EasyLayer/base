import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any;
  blockHeight: string;
}

export class BitcoinBalancesIndexerTransactionsBatchIndexedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionsBatchIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionsBatchIndexedEventPayload) {}
}
