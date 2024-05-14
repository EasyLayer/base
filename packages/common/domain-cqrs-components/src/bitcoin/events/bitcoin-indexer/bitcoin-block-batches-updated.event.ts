import { BasicEvent } from '../../../base.event';

interface BitcoinBlockBatchesUpdatedEventPayload {
  aggregateId: string;
  batches: any;
  requestId: string;
  block: any;
}

export class BitcoinBlockBatchesUpdatedEvent implements BasicEvent<BitcoinBlockBatchesUpdatedEventPayload> {
  constructor(public readonly payload: BitcoinBlockBatchesUpdatedEventPayload) {}
}
