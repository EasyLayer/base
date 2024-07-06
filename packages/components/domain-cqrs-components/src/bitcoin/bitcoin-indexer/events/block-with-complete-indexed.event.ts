import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockWithCompleteIndexedEventPayload {
  aggregateId: string;
  block: any;
  status: string;
  batches: any;
  txCount: number;
  requestId: string;
}

export class BitcoinIndexerBlockWithCompleteIndexedEvent
  implements BasicEvent<BitcoinIndexerBlockWithCompleteIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerBlockWithCompleteIndexedEventPayload) {}
}
