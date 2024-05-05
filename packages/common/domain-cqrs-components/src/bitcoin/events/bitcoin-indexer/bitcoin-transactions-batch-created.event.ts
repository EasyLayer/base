import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  transactions: Map<string, any>;
  blockHeight: bigint;
  blockHash: string;
  status: string;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
