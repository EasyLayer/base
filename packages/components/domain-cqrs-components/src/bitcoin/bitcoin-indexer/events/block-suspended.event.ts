import { BasicEvent } from '../../../base.event';

interface BitcoinIndexerBlockSuspendedEventPayload {
  aggregateId: string;
  requestId: string;
  status: string;
}

export class BitcoinIndexerBlockSuspendedEvent implements BasicEvent<BitcoinIndexerBlockSuspendedEventPayload> {
  constructor(public readonly payload: BitcoinIndexerBlockSuspendedEventPayload) {}
}
