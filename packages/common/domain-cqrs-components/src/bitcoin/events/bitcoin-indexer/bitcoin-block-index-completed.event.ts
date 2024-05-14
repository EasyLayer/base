import { BasicEvent } from '../../../base.event';

interface BitcoinBlockIndexCompletedEventPayload {
  aggregateId: string;
  status: string;
  requestId: string;
  batches: any;
}

export class BitcoinBlockIndexCompletedEvent implements BasicEvent<BitcoinBlockIndexCompletedEventPayload> {
  constructor(public readonly payload: BitcoinBlockIndexCompletedEventPayload) {}
}
