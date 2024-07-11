import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  blockHeight: string;
  blockHash: string;
  status: string;
}

export class BitcoinIndexerTransactionsBatchCreatedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchCreatedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchCreatedEventPayload) {}
}
