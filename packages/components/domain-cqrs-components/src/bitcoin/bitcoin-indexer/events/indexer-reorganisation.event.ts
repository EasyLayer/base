import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerReorganisationEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blocksHashes: any[];
  height: string;
}

export class BitcoinIndexerReorganisationEvent implements BasicEvent<BitcoinIndexerReorganisationEventPayload> {
  constructor(public readonly payload: BitcoinIndexerReorganisationEventPayload) {}
}
