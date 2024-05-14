import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkBlockWithConfirmAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinNetworkBlockWithConfirmAddedEvent implements BasicEvent<BitcoinNetworkBlockWithConfirmAddedEventPayload> {
  constructor(public readonly payload: BitcoinNetworkBlockWithConfirmAddedEventPayload) {}
}
