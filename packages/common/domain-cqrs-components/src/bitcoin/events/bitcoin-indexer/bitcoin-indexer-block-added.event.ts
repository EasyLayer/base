import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinIndexerBlockAddedEvent implements BasicEvent<BitcoinIndexerBlockAddedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlockAddedEventPayload) {}
}
