import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@easylayer/cqrs';
import { Wallet } from '../models//wallet.model';

@Injectable()
export class BitcoinWalletModelFactoryService {
  constructor(private readonly publisher: EventPublisher) {}

  public createNewModel(): Wallet {
    return this.publisher.mergeObjectContext(new Wallet());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initExistingModel(aggregateId: string): Promise<Wallet> {
    return { aggregateId, value: 5 } as Wallet;
  }

  public async initAllModels(): Promise<Wallet[]> {
    // TODO
    return [];
  }
}
