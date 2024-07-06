import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockIndexStartedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  txCount: number;
  requestId: string;
}

export class BitcoinIndexerBlockIndexStartedEvent implements BasicEvent<BitcoinIndexerBlockIndexStartedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlockIndexStartedEventPayload) {}
}
