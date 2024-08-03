import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/core/cqrs';
import { EventStoreRepository } from '@easylayer/core/eventstore';
import { Block } from '../models/block.model';

@Injectable()
export class BlockModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly blocksRepository: EventStoreRepository<Block>
  ) {}

  public createNewModel(): Block {
    return this.publisher.mergeObjectContext(new Block());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<Block> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.blocksRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.blocksRepository.fetchLastEvent(model);
    if (event) {
      await model.republish(event);
    }
  }

  public async initExistingModels(aggregateIds: string[]): Promise<Block[]> {
    const models: Block[] = [];

    aggregateIds.forEach((item) => {
      const model = this.createNewModel();
      model.aggregateId = item;
      models.push(model);
    });

    return await this.blocksRepository.getMany(models);
  }
}
