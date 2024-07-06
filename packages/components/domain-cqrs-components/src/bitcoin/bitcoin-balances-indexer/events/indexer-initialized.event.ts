import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerInitializedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  indexedHeight: string;
}

export class BitcoinBalancesIndexerInitializedEvent
  implements BasicEvent<BitcoinBalancesIndexerInitializedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerInitializedEventPayload) {}
}
