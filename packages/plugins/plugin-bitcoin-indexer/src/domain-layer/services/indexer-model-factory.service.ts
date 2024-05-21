import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Indexer } from '../models/indexer.model';

@Injectable()
export class IndexerModelFactoryService {

  constructor(
    private readonly publisher: EventPublisher,
    private readonly indexerRepository: EventStoreRepository<Indexer>
  ) {
  }

  public createNewModel(): Indexer {
    return this.publisher.mergeObjectContext(new Indexer());
  }

  public async initModel(): Promise<Indexer> {
    const model = await this.indexerRepository.getOne(this.createNewModel());
    // NOTE: If there is no such thing in the database, then we will return the base model.
    return model;
  }

  public async publishLastEvent(): Promise<void> {
    const model = await this.indexerRepository.getOne(this.createNewModel());
    const event = await this.indexerRepository.fetchLastEvent(model);
    return model.publish(event);
  }
}
