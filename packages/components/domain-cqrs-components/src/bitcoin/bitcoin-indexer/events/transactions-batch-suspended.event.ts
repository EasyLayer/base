import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerTransactionsBatchSuspendedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any;
}

export class BitcoinIndexerTransactionsBatchSuspendedEvent
  implements BasicEvent<BitcoinIndexerTransactionsBatchSuspendedEventPayload>
{
  constructor(public readonly payload: BitcoinIndexerTransactionsBatchSuspendedEventPayload) {}
}
