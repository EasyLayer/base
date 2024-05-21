import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  transactions: any;
  blockHash: string;
  blockHeight: string;
}

export class BitcoinTransactionsBatchIndexedEvent implements BasicEvent<BitcoinTransactionsBatchIndexedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchIndexedEventPayload) {}
}
