import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkInitializedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  height: bigint;
}

export class BitcoinNetworkInitializedEvent implements BasicEvent<BitcoinNetworkInitializedEventPayload> {
  constructor(public readonly payload: BitcoinNetworkInitializedEventPayload) {}
}
