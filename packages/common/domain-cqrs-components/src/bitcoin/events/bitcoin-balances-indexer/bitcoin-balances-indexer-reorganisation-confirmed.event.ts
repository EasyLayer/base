import { BasicEvent } from '../../../base.event';

interface BitcoiBalancesIndexerReorganisationConfirmedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  reorganisationHeight: string;
}

export class BitcoiBalancesIndexerReorganisationConfirmedEvent implements BasicEvent<BitcoiBalancesIndexerReorganisationConfirmedEventPayload> {
  constructor(public readonly payload: BitcoiBalancesIndexerReorganisationConfirmedEventPayload) {}
}
