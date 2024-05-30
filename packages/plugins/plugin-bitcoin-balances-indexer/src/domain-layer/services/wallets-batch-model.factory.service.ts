import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { WalletsBatch } from '../models/wallets-batch.model';

@Injectable()
export class WalletsBatchModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly batchRepository: EventStoreRepository<WalletsBatch>
  ) {}

  public createNewModel(): WalletsBatch {
    return this.publisher.mergeObjectContext(new WalletsBatch());
  }

  public async initExistingModel(aggragatorId: string): Promise<WalletsBatch> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.batchRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.batchRepository.fetchLastEvent(model);
    return model.publish(event);
  }

  public async initAllModels(): Promise<WalletsBatch[]> {
    // TODO
    return [];
  }
}
