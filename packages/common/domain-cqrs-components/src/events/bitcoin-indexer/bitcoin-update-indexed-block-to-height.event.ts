import { BasicEvent } from '../base.event';

interface BitcoinUpdateIndexedBlockHeightEventPayload {
  aggregateId: string;
  height: bigint;
}

export class BitcoinUpdateIndexedBlockHeightEvent implements BasicEvent<BitcoinUpdateIndexedBlockHeightEventPayload> {
  constructor(public readonly payload: BitcoinUpdateIndexedBlockHeightEventPayload) {}
}
