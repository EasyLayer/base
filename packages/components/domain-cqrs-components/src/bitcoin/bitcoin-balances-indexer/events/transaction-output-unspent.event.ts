import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerTransactionOutputUnspentEventPayload {
  aggregateId: string;
  voutIndex: number;
  requestId: string;
}

export class BitcoinBalancesIndexerTransactionOutputUnspentEvent
  implements BasicEvent<BitcoinBalancesIndexerTransactionOutputUnspentEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerTransactionOutputUnspentEventPayload) {}
}
