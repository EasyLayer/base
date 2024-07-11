import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionOutputSpentEventPayload {
  aggregateId: string;
  voutIndex: number;
  requestId: string;
}

export class BitcoinBalancesIndexerTransactionOutputSpentEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionOutputSpentEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionOutputSpentEventPayload) {}
}
