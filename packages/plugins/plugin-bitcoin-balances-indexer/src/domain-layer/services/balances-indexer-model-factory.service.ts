// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { BalancesIndexer } from '../models/balances-indexer.model';

@Injectable()
export class BalancesIndexerModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly indexerRepository: EventStoreRepository<BalancesIndexer>
  ) {}

  public createNewModel(): BalancesIndexer {
    return this.publisher.mergeObjectContext(new BalancesIndexer());
  }

  public async initModel(): Promise<BalancesIndexer> {
    const model = await this.indexerRepository.getOne(this.createNewModel());
    // NOTE: If there is no such thing in the database, then we will return the base model.
    return model;
  }

  public async publishLastEvent(): Promise<void> {
    const model = await this.indexerRepository.getOne(this.createNewModel());
    const event = await this.indexerRepository.fetchLastEvent(model);
    if (event) {
      await model.republish(event);
    }
  }
}
