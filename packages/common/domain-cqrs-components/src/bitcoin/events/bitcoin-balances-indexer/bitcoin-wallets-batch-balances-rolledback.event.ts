import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchBalancesRolledbackEventPayload {
  aggregateId: string;
  requestId: string;
  balances: any;
}

export class BitcoinWalletsBatchBalancesRolledbackEvent implements BasicEvent<BitcoinWalletsBatchBalancesRolledbackEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchBalancesRolledbackEventPayload) {}
}