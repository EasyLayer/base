import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchBalancesRolledbackEventPayload {
  aggregateId: string;
  requestId: string;
  wallets: any;
  status: string;
}

export class BitcoinWalletsBatchBalancesRolledbackEvent implements BasicEvent<BitcoinWalletsBatchBalancesRolledbackEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchBalancesRolledbackEventPayload) {}
}