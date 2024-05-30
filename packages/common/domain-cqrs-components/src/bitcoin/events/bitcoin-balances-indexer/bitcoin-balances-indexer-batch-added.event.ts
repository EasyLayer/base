import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBatchAddedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  status: string;
  blockHeight: string;
  blockHash: string;
}

export class BitcoinBalancesIndexerBatchAddedEvent implements BasicEvent<BitcoinBalancesIndexerBatchAddedEventPayload> {
  constructor(public readonly payload: BitcoinBalancesIndexerBatchAddedEventPayload) {}
}
