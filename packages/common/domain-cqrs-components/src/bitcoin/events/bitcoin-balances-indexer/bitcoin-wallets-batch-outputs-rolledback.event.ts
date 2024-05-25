import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchOutputsRolledbackEventPayload {
  aggregateId: string;
  requestId: string;
  outputs: any;
}

export class BitcoinWalletsBatchOutputsRolledbackEvent implements BasicEvent<BitcoinWalletsBatchOutputsRolledbackEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchOutputsRolledbackEventPayload) {}
}