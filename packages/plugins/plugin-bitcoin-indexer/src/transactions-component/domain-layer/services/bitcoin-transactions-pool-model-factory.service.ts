import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { TransactionsPool } from '../models/transactions-pool.model';

@Injectable()
export class BitcoinTransactionsPoolModelFactoryService {
  constructor(private readonly publisher: EventPublisher) {}

  public createNewModel(): TransactionsPool {
    return this.publisher.mergeObjectContext(new TransactionsPool());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggragatorId: string): Promise<TransactionsPool> {
    const model = this.createNewModel();
    model.aggregateId = aggragatorId;
    return model;
  }

  public async initLastModel(): Promise<TransactionsPool> {
    // Как я буду доставать последний агрегат?
    // Не может быть такого что события как то будут после??
    // Мы должны смотреть дату и статус? типо в процессе та что.
    // Ну у нас скорее всего статуса не будет в raw верхнего уровня

    // ИЛИ же это тоже будет один агрегат типо. Будем ему постоянно менять там с какого по какой транзакции мы смотрим.
    const model = this.createNewModel();
    return model;
  }
}
