import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerSynchronisationEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  blockHeight: string;
  blockHash: string;
  batchIndex: number;
  isFinalBatch: boolean;
}

export class BitcoinBalancesIndexerSynchronisationEvent implements BasicEvent<BitcoinBalancesIndexerSynchronisationEventPayload> {
  constructor(public readonly payload: BitcoinBalancesIndexerSynchronisationEventPayload) {}
}
