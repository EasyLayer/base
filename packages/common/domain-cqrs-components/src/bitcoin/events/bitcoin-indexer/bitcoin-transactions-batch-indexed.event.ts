import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any; //: { transactions, index, isFinalBatch }
  blockHash: string;
  blockHeight: string;
}

export class BitcoinTransactionsBatchIndexedEvent implements BasicEvent<BitcoinTransactionsBatchIndexedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchIndexedEventPayload) {}
}
