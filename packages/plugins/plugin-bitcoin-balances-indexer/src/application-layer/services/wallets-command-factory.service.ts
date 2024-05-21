// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';

@Injectable()
export class WalletsCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}
  
  public async index(dto: { blockHeight: string, blockHash: string, transactions: any, requestId: string, batchId: string }): Promise<void> {
    await this.commandBus.execute(new IndexBalancesCommand(dto));
  }
}
