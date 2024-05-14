import { BasicEvent } from '../../../base.event';

interface BitcoinBlockWithCompleteIndexedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  requestId: string;
}

export class BitcoinBlockWithCompleteIndexedEvent implements BasicEvent<BitcoinBlockWithCompleteIndexedEventPayload> {
  constructor(public readonly payload: BitcoinBlockWithCompleteIndexedEventPayload) {}
}
