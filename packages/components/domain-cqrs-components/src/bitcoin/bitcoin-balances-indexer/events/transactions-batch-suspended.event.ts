import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionsBatchSuspendedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
  batch: any;
}

export class BitcoinBalancesIndexerTransactionsBatchSuspendedEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionsBatchSuspendedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionsBatchSuspendedEventPayload) {}
}
