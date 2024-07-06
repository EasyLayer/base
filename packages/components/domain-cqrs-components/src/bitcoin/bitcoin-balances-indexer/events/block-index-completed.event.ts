import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlockIndexCompletedEventPayload {
  aggregateId: string;
  status: string;
  requestId: string;
  batches: any;
  block: any;
}

export class BitcoinBalancesIndexerBlockIndexCompletedEvent
  implements BasicEvent<BitcoinBalancesIndexerBlockIndexCompletedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerBlockIndexCompletedEventPayload) {}
}
