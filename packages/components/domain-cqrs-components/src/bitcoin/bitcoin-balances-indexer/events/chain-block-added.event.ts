import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerChainBlockAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinBalancesIndexerChainBlockAddedEvent
  implements BasicEvent<BitcoinBalancesIndexerChainBlockAddedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerChainBlockAddedEventPayload) {}
}
