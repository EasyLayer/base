import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlockIndexStartedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  txCount: number;
  requestId: string;
}

export class BitcoinBalancesIndexerBlockIndexStartedEvent
  implements BasicEvent<BitcoinBalancesIndexerBlockIndexStartedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerBlockIndexStartedEventPayload) {}
}
