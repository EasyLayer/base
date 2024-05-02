import { BasicEvent } from '../../../base.event';

interface BitcoinNetworkReorganisationEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinNetworkReorganisationEvent implements BasicEvent<BitcoinNetworkReorganisationEventPayload> {
  constructor(public readonly payload: BitcoinNetworkReorganisationEventPayload) {}
}
