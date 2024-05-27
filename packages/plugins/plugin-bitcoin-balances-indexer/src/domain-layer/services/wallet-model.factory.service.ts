import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { WalletsBatch } from '../models/wallets-batch.model';

@Injectable()
export class WalletModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly blocksRepository: EventStoreRepository<WalletsBatch>
  ) {}

  public createNewModel(): WalletsBatch {
    return this.publisher.mergeObjectContext(new WalletsBatch());
  }

  public async initExistingModel(aggragatorId: string): Promise<WalletsBatch> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.blocksRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.blocksRepository.fetchLastEvent(model);
    return model.publish(event);
  }

  public async initAllModels(): Promise<WalletsBatch[]> {
    // TODO
    return [];
  }
}
