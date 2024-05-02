import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchCreatedEventPayload {
  aggregateId: string;
  wallets: any[];
  transactionBatchId: string;
}

export class BitcoinWalletsBatchCreatedEvent implements BasicEvent<BitcoinWalletsBatchCreatedEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchCreatedEventPayload) {}
}
