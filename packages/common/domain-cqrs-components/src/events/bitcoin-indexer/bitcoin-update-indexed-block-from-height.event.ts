import { BasicEvent } from '../base.event';

interface BitcoinUpdateIndexedBlockFromHeightEventPayload {
  aggregateId: string;
  height: bigint;
}

export class BitcoinUpdateIndexedBlockFromHeightEvent
  implements BasicEvent<BitcoinUpdateIndexedBlockFromHeightEventPayload>
{
  constructor(public readonly payload: BitcoinUpdateIndexedBlockFromHeightEventPayload) {}
}
