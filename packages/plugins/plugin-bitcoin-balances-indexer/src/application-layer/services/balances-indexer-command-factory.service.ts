// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { InitBalancesIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin';

@Injectable()
export class BalancesIndexerCommandFactoryService {
  constructor(
    private readonly commandBus: CommandBus
  ) {}

  public async init(dto: { requestId: string }): Promise<void> {
    return await this.commandBus.execute(
      new InitBalancesIndexerCommand(dto)
    );
  }
}
