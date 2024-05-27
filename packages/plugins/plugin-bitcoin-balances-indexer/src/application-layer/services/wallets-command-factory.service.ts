// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexBalancesCommand, RollbackBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';

@Injectable()
export class WalletsCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}
  
  public async index(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexBalancesCommand(dto));
  }

  public async rollback(dto: any): Promise<void> {
    await this.commandBus.execute(new RollbackBalancesCommand(dto));
  }
}
