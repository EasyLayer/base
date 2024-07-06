import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerChainIndexBlockConfirmedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  block: any;
}

export class BitcoinIndexerChainIndexBlockConfirmedEvent
  implements BasicEvent<BitcoinIndexerChainIndexBlockConfirmedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerChainIndexBlockConfirmedEventPayload) {}
}
