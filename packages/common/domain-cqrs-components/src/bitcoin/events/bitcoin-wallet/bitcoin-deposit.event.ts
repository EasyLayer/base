import { BasicEvent } from '../../../base.event';

interface BitcoinDepositReceivedEventPayload {
  aggregateId: string;
  value: number;
}

export class BitcoinDepositReceivedEvent implements BasicEvent<BitcoinDepositReceivedEventPayload> {
  constructor(public readonly payload: BitcoinDepositReceivedEventPayload) {}
}
