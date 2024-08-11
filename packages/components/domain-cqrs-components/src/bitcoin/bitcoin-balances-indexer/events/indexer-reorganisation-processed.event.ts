import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerReorganisationProcessedEventPayload {
  aggregateId: string;
  requestId: string;
  height: string;
  blocks: any[];
}

export class BitcoinBalancesIndexerReorganisationProcessedEvent
  implements BasicEvent<BitcoinBalancesIndexerReorganisationProcessedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerReorganisationProcessedEventPayload) {}
}
