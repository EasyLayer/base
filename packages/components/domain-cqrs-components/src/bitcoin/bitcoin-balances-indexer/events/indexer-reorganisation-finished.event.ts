import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerReorganisationFinishedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  height: string;
}

export class BitcoinBalancesIndexerReorganisationFinishedEvent
  implements BasicEvent<BitcoinBalancesIndexerReorganisationFinishedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerReorganisationFinishedEventPayload) {}
}
