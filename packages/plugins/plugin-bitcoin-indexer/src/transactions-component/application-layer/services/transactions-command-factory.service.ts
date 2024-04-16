// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import {
  CreateBitcoinTransactionsPoolCommand,
  IndexBitcoinTransactionsBatchCommand,
} from '@easylayer/domain-cqrs-components';

@Injectable()
export class BitcoinTransactionsCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async createTransactionsPool(dto: any): Promise<void> {
    await this.commandBus.execute(new CreateBitcoinTransactionsPoolCommand(dto));
  }

  public async indexTransactionsBatch(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexBitcoinTransactionsBatchCommand(dto));
  }
}
