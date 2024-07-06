import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockIndexCompletedEventPayload {
  aggregateId: string;
  status: string;
  requestId: string;
  batches: any;
  block: any;
  txCount: number;
}

export class BitcoinIndexerBlockIndexCompletedEvent
  implements BasicEvent<BitcoinIndexerBlockIndexCompletedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerBlockIndexCompletedEventPayload) {}
}
