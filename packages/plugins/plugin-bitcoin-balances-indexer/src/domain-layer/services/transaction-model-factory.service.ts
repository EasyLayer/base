import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Transaction } from '../models/transaction.model';

@Injectable()
export class TransactionModelFactoryService {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly txRepository: EventStoreRepository<Transaction>
  ) {}

  public createNewModel(): Transaction {
    return this.publisher.mergeObjectContext(new Transaction());
  }

  public async initExistingModel(aggragatorId: string): Promise<Transaction> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return await this.txRepository.getOne(model);
  }

  public async publishLastEvent(aggragatorId: string): Promise<void> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    const event = await this.txRepository.fetchLastEvent(model);
    if (event) {
      await model.republish(event);
    }
  }
}
