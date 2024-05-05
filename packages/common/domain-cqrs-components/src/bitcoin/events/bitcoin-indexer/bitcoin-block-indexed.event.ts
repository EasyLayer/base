import { BasicEvent } from '../../../base.event';

interface BitcoinBlockIndexStartedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: Map<string, string>;
  requestId: string;
}

export class BitcoinBlockIndexStartedEvent implements BasicEvent<BitcoinBlockIndexStartedEventPayload> {
  constructor(public readonly payload: BitcoinBlockIndexStartedEventPayload) {}
}
