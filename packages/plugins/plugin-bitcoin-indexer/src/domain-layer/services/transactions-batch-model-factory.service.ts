import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { TransactionsBatch } from '../models/transactions-batch';

@Injectable()
export class TransactionsBatchModelFactoryService {
  constructor(private readonly publisher: EventPublisher) {}

  public createNewModel(): TransactionsBatch {
    return this.publisher.mergeObjectContext(new TransactionsBatch());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<TransactionsBatch> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return model;
  }

  public async initLastModel(): Promise<TransactionsBatch> {
    const model = this.createNewModel();
    return model;
  }
}
