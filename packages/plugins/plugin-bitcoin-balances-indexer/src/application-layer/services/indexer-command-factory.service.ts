// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { InitIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

@Injectable()
export class IndexerCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async init(dto: any): Promise<void> {
    return await this.commandBus.execute(new InitIndexerCommand(dto));
  }
}
