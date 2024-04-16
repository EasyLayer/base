import { BasicEvent } from '../base.event';

interface BitcoinBlockParsedEventPayload {
  aggregateId: string;
  block: any;
}

export class BitcoinBlockParsedEvent implements BasicEvent<BitcoinBlockParsedEventPayload> {
  constructor(public readonly payload: BitcoinBlockParsedEventPayload) {}
}
