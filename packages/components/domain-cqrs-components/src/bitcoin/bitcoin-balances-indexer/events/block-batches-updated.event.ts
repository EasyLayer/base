import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlockBatchesUpdatedEventPayload {
  aggregateId: string;
  batches: any;
  requestId: string;
  block: any;
}

export class BitcoinBalancesIndexerBlockBatchesUpdatedEvent
  implements BasicEvent<BitcoinBalancesIndexerBlockBatchesUpdatedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerBlockBatchesUpdatedEventPayload) {}
}
