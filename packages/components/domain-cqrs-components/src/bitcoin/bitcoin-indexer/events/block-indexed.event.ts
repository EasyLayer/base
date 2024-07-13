import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockIndexedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  txCount: number;
  requestId: string;
}

export class BitcoinIndexerBlockIndexedEvent implements BasicEvent<BitcoinIndexerBlockIndexedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlockIndexedEventPayload) {}
}
