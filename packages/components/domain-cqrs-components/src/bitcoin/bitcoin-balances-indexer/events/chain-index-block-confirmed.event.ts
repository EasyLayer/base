import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerIndexBlockConfirmedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  block: any;
}

export class BitcoinBalancesIndexerIndexBlockConfirmedEvent
  implements BasicEvent<BitcoinBalancesIndexerIndexBlockConfirmedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerIndexBlockConfirmedEventPayload) {}
}
