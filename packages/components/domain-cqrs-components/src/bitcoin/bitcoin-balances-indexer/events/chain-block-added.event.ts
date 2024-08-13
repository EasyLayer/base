import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlocksAddedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blocks: any;
}

export class BitcoinBalancesIndexerBlocksAddedEvent
  implements BasicEvent<BitcoinBalancesIndexerBlocksAddedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerBlocksAddedEventPayload) {}
}
