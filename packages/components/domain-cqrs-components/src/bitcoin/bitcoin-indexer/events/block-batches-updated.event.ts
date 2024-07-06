import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockBatchesUpdatedEventPayload {
  aggregateId: string;
  batches: any;
  requestId: string;
  block: any;
}

export class BitcoinIndexerBlockBatchesUpdatedEvent
  implements BasicEvent<BitcoinIndexerBlockBatchesUpdatedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerBlockBatchesUpdatedEventPayload) {}
}
