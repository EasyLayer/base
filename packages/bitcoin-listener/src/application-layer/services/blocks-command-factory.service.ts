// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/core/cqrs';
import { HandleBlocksBatchCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-listener';

@Injectable()
export class BlocksCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexBlock(dto: any): Promise<void> {
    await this.commandBus.execute(new HandleBlocksBatchCommand({ ...dto }));
  }
}
