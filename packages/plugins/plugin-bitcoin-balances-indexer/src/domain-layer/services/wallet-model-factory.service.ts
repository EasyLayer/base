import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Wallet } from '../models/wallet.model';

@Injectable()
export class WalletModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly walletsRepository: EventStoreRepository<Wallet>
  ) {}

  public createNewModel(): Wallet {
    return this.publisher.mergeObjectContext(new Wallet());
  }

  public async initExistingModel(aggragatorId: string): Promise<Wallet> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.walletsRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.walletsRepository.fetchLastEvent(model);
    return model.publish(event);
  }

  public async initAllModels(): Promise<Wallet[]> {
    // TODO
    return [];
  }
}
