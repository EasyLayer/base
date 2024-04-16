import { BasicEvent } from '../base.event';

interface BitcoinTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  transactions: any[];
  blockId: string;
  transactionsPoolId: string;
}

export class BitcoinTransactionsBatchCreatedEvent implements BasicEvent<BitcoinTransactionsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchCreatedEventPayload) {}
}
