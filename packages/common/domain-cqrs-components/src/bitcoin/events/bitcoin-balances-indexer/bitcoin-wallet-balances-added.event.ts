import { BasicEvent } from '../../../base.event';

interface BitcoinWalletBalancesAddedEventPayload {
  aggregateId: string;
  requestId: string;
  walletBalances: any;
}

export class BitcoinWalletBalancesAddedEvent implements BasicEvent<BitcoinWalletBalancesAddedEventPayload> {
  constructor(public readonly payload: BitcoinWalletBalancesAddedEventPayload) {}
}