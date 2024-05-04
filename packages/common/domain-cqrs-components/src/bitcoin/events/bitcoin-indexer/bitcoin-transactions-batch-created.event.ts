import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  transactions: Set<string>;
  blockHeight: bigint;
  blockHash: string;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
