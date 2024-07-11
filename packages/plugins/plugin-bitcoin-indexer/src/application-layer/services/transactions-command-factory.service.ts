// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexTransactionsBatchCommand } from '@easylayer/domain-cqrs-components/bitcoin-indexer';

@Injectable()
export class TransactionsCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexTransactionsBatch(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexTransactionsBatchCommand(dto));
  }
}
