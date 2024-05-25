import { BasicEvent } from '../../../base.event';

interface BitcoinWalletsBatchOutputsIndexedEventPayload {
  aggregateId: string;
  requestId: string;
  outputs: any;
}

export class BitcoinWalletsBatchOutputsIndexedEvent implements BasicEvent<BitcoinWalletsBatchOutputsIndexedEventPayload> {
  constructor(public readonly payload: BitcoinWalletsBatchOutputsIndexedEventPayload) {}
}
