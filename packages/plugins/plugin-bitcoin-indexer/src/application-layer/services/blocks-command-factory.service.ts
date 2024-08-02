// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/core/cqrs';
import { IndexBlockCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';

@Injectable()
export class BlocksCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexBlock(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexBlockCommand({ ...dto }));
  }
}
