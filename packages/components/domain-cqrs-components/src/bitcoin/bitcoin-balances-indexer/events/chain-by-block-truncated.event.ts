import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerChainByBlockTruncatedEventPayload {
  aggregateId: string;
  requestId: string;
  height: string;
  block: any;
}

export class BitcoinBalancesIndexerChainByBlockTruncatedEvent
  implements BasicEvent<BitcoinBalancesIndexerChainByBlockTruncatedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerChainByBlockTruncatedEventPayload) {}
}
