import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerChainBlockAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
  batches: string[];
}

export class BitcoinIndexerChainBlockAddedEvent implements BasicEvent<BitcoinIndexerChainBlockAddedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerChainBlockAddedEventPayload) {}
}
