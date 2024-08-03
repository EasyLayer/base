import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any;
  blockHeight: string;
  blockHash: string;
}

export class BitcoinIndexerTransactionsBatchIndexedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchIndexedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchIndexedEventPayload) {}
}
