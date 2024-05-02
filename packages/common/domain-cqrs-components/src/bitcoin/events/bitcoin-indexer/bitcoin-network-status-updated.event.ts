import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkStatusUpdatedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
}

export class BitcoinNetworkStatusUpdatedEvent implements BasicEvent<BitcoinNetworkStatusUpdatedEventPayload> {
  constructor(public readonly payload: BitcoinNetworkStatusUpdatedEventPayload) {}
}
