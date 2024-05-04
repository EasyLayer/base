import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkIndexBlockConfirmedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  block: any
}

export class BitcoinNetworkIndexBlockConfirmedEvent implements BasicEvent<BitcoinNetworkIndexBlockConfirmedEventPayload> {
  constructor(public readonly payload: BitcoinNetworkIndexBlockConfirmedEventPayload) {}
}
