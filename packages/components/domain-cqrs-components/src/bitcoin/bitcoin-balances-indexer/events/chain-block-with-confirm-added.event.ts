import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerChainBlockWithConfirmAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinBalancesIndexerChainBlockWithConfirmAddedEvent
  implements BasicEvent<BitcoinBalancesIndexerChainBlockWithConfirmAddedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerChainBlockWithConfirmAddedEventPayload) {}
}
