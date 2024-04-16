import { BasicEvent } from '../base.event';

interface BitcoinBlockIndexedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
}

export class BitcoinBlockIndexedEvent implements BasicEvent<BitcoinBlockIndexedEventPayload> {
  constructor(public readonly payload: BitcoinBlockIndexedEventPayload) {}
}
