import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchBalancesIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  balances: any;
}

export class BitcoinWalletsBatchBalancesIndexedEvent implements BasicEvent<BitcoinWalletsBatchBalancesIndexedEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchBalancesIndexedEventPayload) {}
}
