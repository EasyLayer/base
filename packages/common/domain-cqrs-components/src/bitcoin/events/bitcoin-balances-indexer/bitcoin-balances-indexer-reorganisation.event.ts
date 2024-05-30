import { BasicEvent } from '../../../base.event';

interface BitcoiBalancesIndexerReorganisationEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blockBatches: any[];
  reorganisationHeight: string;
  blockHash: string,
  blockHeight: string,
}

export class BitcoiBalancesIndexerReorganisationEvent implements BasicEvent<BitcoiBalancesIndexerReorganisationEventPayload> {
  constructor(public readonly payload: BitcoiBalancesIndexerReorganisationEventPayload) {}
}
