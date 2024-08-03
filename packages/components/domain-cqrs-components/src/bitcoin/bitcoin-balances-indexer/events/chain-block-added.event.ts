import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerBlockAddedEventPayload {
  aggregateId: string;
  requestId: string;
  block: any;
  status: string;
}

export class BitcoinBalancesIndexerBlockAddedEvent implements BasicEvent<BitcoinBalancesIndexerBlockAddedEventPayload> {
  constructor(public readonly payload: BitcoinBalancesIndexerBlockAddedEventPayload) {}
}
