import { BasicEvent } from '../base.event';

interface BitcoinBlockIndexCompletedEventPayload {
  aggregateId: string;
  transactionsPoolId: string;
  status: string;
}

export class BitcoinBlockIndexCompletedEvent implements BasicEvent<BitcoinBlockIndexCompletedEventPayload> {
  constructor(public readonly payload: BitcoinBlockIndexCompletedEventPayload) {}
}
