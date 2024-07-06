import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionsBatchWithIndexCreatedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  blockHeight: string;
  blockHash: string;
  status: string;
}

export class BitcoinBalancesIndexerTransactionsBatchWithIndexCreatedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionsBatchWithIndexCreatedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionsBatchWithIndexCreatedEventPayload) {}
}
