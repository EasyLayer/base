import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/core/cqrs';
import { EventStoreRepository } from '@easylayer/core/eventstore';
import { TransactionsBatch } from '../models/transactions-batch.model';

@Injectable()
export class TransactionsBatchModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly batchesRepository: EventStoreRepository<TransactionsBatch>
  ) {}

  public createNewModel(): TransactionsBatch {
    return this.publisher.mergeObjectContext(new TransactionsBatch());
  }

  public async initExistingModel(aggragatorId: string): Promise<TransactionsBatch> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.batchesRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.batchesRepository.fetchLastEvent(model);
    if (event) {
      await model.republish(event);
    }
  }

  public async initExistingModels(aggregateIds: string[]): Promise<TransactionsBatch[]> {
    const models: TransactionsBatch[] = [];

    aggregateIds.forEach((item) => {
      const model = this.createNewModel();
      model.aggregateId = item;
      models.push(model);
    });

    return await this.batchesRepository.getMany(models);
  }
}
