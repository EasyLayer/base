import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlockWithCompleteIndexedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  txCount: number;
  requestId: string;
}

export class BitcoinBalancesIndexerBlockWithCompleteIndexedEvent
  implements BasicEvent<BitcoinBalancesIndexerBlockWithCompleteIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerBlockWithCompleteIndexedEventPayload) {}
}
