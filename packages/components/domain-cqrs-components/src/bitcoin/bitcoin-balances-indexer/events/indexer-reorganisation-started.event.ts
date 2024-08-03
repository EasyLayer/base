import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerReorganisationStartedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blocks: any[];
  height: string;
}

export class BitcoinBalancesIndexerReorganisationStartedEvent
  implements BasicEvent<BitcoinBalancesIndexerReorganisationStartedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerReorganisationStartedEventPayload) {}
}
