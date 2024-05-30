import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchBalancesIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  balances: any;
  status: string;
}

export class BitcoinWalletsBatchBalancesIndexedEvent implements BasicEvent<BitcoinWalletsBatchBalancesIndexedEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchBalancesIndexedEventPayload) {}
}
