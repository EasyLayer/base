import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockWithConfirmAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinIndexerBlockWithConfirmAddedEvent implements BasicEvent<BitcoinIndexerBlockWithConfirmAddedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlockWithConfirmAddedEventPayload) {}
}
