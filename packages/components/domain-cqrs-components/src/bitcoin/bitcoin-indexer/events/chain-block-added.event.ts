import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlocksAddedEventPayload {
  aggregateId: string;
  requestId: string;
  blocks: any;
  status: string;
}

export class BitcoinIndexerBlocksAddedEvent implements BasicEvent<BitcoinIndexerBlocksAddedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlocksAddedEventPayload) {}
}
