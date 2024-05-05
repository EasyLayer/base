import { BasicEvent } from '../../../base.event';

interface BitcoinTransactionsBatchIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
}

export class BitcoinTransactionsBatchIndexedEvent implements BasicEvent<BitcoinTransactionsBatchIndexedEventPayload> {
  constructor(public readonly payload: BitcoinTransactionsBatchIndexedEventPayload) {}
}
