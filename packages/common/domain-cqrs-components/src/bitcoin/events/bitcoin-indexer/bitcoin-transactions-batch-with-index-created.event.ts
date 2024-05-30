import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchWithIndexCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  blockHeight: string;
  blockHash: string;
  status: string;
}

export class BitcoinTransactionsBatchWithIndexCreatedEvent implements BasicEvent<BitcoinTransactionsBatchWithIndexCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchWithIndexCreatedEventPayload) {}
}
