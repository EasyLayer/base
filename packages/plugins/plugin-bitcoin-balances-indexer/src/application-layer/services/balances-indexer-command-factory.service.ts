// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/core/cqrs';
import {
  InitIndexerCommand,
  ProcessReorganisationCommand,
} from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';

@Injectable()
export class BalancesIndexerCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async init(dto: any): Promise<void> {
    return await this.commandBus.execute(new InitIndexerCommand(dto));
  }

  public async processReorganisation(dto: any): Promise<void> {
    return await this.commandBus.execute(new ProcessReorganisationCommand(dto));
  }
}
