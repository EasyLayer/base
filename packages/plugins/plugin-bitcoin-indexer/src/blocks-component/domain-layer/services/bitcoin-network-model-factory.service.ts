import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { Network } from '../models/network.model';

@Injectable()
export class BitcoinNetworkModelFactoryService {
  public testNetworkAggregate;

  constructor(private readonly publisher: EventPublisher) {
    this.testNetworkAggregate = this.publisher.mergeObjectContext(new Network());
    this.testNetworkAggregate.aggregateId = uuidv4();
    this.testNetworkAggregate.indexedBlockFromHeight = BigInt('0');
    this.testNetworkAggregate.indexedBlockHeight = BigInt('0');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initModel(blockFromHeight: bigint = 0n, blockHeight: bigint = 0n): Promise<Network> {
    return this.testNetworkAggregate;
  }
}
