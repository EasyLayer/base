import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerReorganisationEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinIndexerReorganisationEvent implements BasicEvent<BitcoinIndexerReorganisationEventPayload> {
  constructor(public readonly payload: BitcoinIndexerReorganisationEventPayload) {}
}
