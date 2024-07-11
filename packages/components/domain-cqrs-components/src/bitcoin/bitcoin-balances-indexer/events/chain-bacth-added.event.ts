import { BasicEvent } from '../../../base.event';

interface BitcoinBalancesIndexerChainBacthAddedEventPayload {
  aggregateId: string;
  requestId: string;
  batch: any;
  status: string;
  blockHash: string;
  blockHeight: string;
  prevBlockHash: string;
}

export class BitcoinBalancesIndexerChainBacthAddedEvent
  implements BasicEvent<BitcoinBalancesIndexerChainBacthAddedEventPayload>
{
  constructor(public readonly payload: BitcoinBalancesIndexerChainBacthAddedEventPayload) {}
}
