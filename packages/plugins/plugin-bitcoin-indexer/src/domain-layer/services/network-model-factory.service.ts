import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Network } from '../models/network.model';

@Injectable()
export class NetworkModelFactoryService {

  constructor(
    private readonly publisher: EventPublisher,
    private readonly networkRepository: EventStoreRepository<Network>
  ) {
    // this.testNetworkAggregate = this.publisher.mergeObjectContext(new Network());
    // this.testNetworkAggregate.aggregateId = uuidv4();
    // this.testNetworkAggregate.indexedBlockFromHeight = BigInt('0');
    // this.testNetworkAggregate.indexedBlockHeight = BigInt('0');
  }

  public createNewModel(): Network {
    return this.publisher.mergeObjectContext(new Network());
  }

  public async initModel(): Promise<Network> {
    const model = await this.networkRepository.getOne(this.createNewModel());
    // NOTE: If there is no such thing in the database, then we will return the base model.
    return model;
  }

  public async publishLastEvent(): Promise<void> {
    const model = await this.networkRepository.getOne(this.createNewModel());
    const event = await this.networkRepository.fetchLastEvent(model);
    return model.publish(event);
  }
}
