import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { TransactionsBatch } from '../models/transactions-batch';

@Injectable()
export class BitcoinTransactionsBatchModelFactoryService {
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
    // Как я буду доставать последний агрегат?
    // Не может быть такого что события как то будут после??
    // Мы должны смотреть дату и статус? типо в процессе та что.
    // Ну у нас скорее всего статуса не будет в raw верхнего уровня

    // ИЛИ же это тоже будет один агрегат типо. Будем ему постоянно менять там с какого по какой транзакции мы смотрим.
    const model = this.createNewModel();
    return model;
  }
}
