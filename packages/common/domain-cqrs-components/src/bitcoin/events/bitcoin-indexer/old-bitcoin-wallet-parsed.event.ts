import { BasicEvent } from '../../../base.event';

interface BitcoinWalletParsedEventPayload {
  aggregateId: string;
  wallet: any;
}

export class BitcoinWalletParsedEvent implements BasicEvent<BitcoinWalletParsedEventPayload> {
  constructor(public readonly payload: BitcoinWalletParsedEventPayload) {}
}
