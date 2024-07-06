import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerReorganisationEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blocksHashes: any[];
  height: string;
}

export class BitcoinBalancesIndexerReorganisationEvent
  implements BasicEvent<BitcoinBalancesIndexerReorganisationEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerReorganisationEventPayload) {}
}
