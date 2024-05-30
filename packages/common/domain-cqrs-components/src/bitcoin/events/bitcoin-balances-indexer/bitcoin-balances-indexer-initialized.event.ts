import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerInitializedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blockHeight: string;
  blockHash: string;
  batchIndex: number;
  isFinalBatch: boolean;
}

export class BitcoinBalancesIndexerInitializedEvent implements BasicEvent<BitcoinBalancesIndexerInitializedEventPayload> {
  constructor(public readonly payload: BitcoinBalancesIndexerInitializedEventPayload) {}
}
