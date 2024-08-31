import { BasicEvent } from '../../../base.event';

interface BitcoinKeysPairAddedEventPayload {
  aggregateId: string;
  requestId: string;
  publicKeyHash: string;
}

export class BitcoinKeysPairAddedEvent implements BasicEvent<BitcoinKeysPairAddedEventPayload> {
  constructor(public readonly payload: BitcoinKeysPairAddedEventPayload) {}
}
