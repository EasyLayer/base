import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchWithIndexCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  blockHeight: string;
  blockHash: string;
  status: string;
}

export class BitcoinIndexerTransactionsBatchWithIndexCreatedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchWithIndexCreatedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchWithIndexCreatedEventPayload) {}
}
