import { BasicEvent } from '../base.event';

interface BitcoinNetworkEventPayload {
  aggregateId: string;
}

export class BitcoinNetworkCreatedEvent implements BasicEvent<BitcoinNetworkEventPayload> {
  constructor(public readonly payload: BitcoinNetworkEventPayload) {}
}
