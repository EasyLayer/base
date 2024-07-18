// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexTransactionsCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

@Injectable()
export class BacthesCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexBatch(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexTransactionsCommand({ ...dto }));
  }
}
