import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { Transaction } from '../models/transaction.model';

@Injectable()
export class TransactionModelFactoryService {
  constructor(private readonly publisher: EventPublisher) {}

  public createNewModel(): Transaction {
    return this.publisher.mergeObjectContext(new Transaction());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<Transaction> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return model;
  }

  public async initAllModels(): Promise<Transaction[]> {
    // TODO
    return [];
  }
}
