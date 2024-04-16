// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexBitcoinBlockCommand, CompleteIndexBitcoinBlockCommand } from '@easylayer/domain-cqrs-components';

@Injectable()
export class BitcoinBlocksCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexBlock(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexBitcoinBlockCommand({ ...dto }));
  }

  public async completeIndexBlock(dto: any): Promise<void> {
    await this.commandBus.execute(new CompleteIndexBitcoinBlockCommand({ ...dto }));
  }
}
