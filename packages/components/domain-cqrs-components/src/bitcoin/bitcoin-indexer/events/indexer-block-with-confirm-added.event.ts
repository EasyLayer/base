import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerChainBlockWithConfirmAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinIndexerChainBlockWithConfirmAddedEvent
  implements BasicEvent<BitcoinIndexerChainBlockWithConfirmAddedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerChainBlockWithConfirmAddedEventPayload) {}
}
