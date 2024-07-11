import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionIndexedEventPayload {
  aggregateId: string;
  outputs: any;
  status: string;
  requestId: string;
  blockHeight: string;
  blockHash: string;
}

export class BitcoinBalancesIndexerTransactionIndexedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionIndexedEventPayload) {}
}
