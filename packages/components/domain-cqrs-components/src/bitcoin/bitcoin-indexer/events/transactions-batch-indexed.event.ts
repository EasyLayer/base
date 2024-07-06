import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any; //: { transactions, index, isFinalBatch }
  blockHash: string;
  blockHeight: string;
}

export class BitcoinIndexerTransactionsBatchIndexedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchIndexedEventPayload) {}
}
