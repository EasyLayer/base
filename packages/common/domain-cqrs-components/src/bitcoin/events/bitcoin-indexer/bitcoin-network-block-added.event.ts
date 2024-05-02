import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkBlockAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinNetworkBlockAddedEvent implements BasicEvent<BitcoinNetworkBlockAddedEventPayload> {
  constructor(public readonly payload: BitcoinNetworkBlockAddedEventPayload) {}
}
