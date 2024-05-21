import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerIndexBlockConfirmedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  block: any
}

export class BitcoinIndexerIndexBlockConfirmedEvent implements BasicEvent<BitcoinIndexerIndexBlockConfirmedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerIndexBlockConfirmedEventPayload) {}
}
