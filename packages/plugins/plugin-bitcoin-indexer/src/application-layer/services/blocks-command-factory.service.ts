// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import { IndexBlockCommand, CompleteIndexBitcoinBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin';

@Injectable()
export class BlocksCommandFactoryService {
  constructor(private readonly commandBus: CommandBus) {}

  public async indexBlock(dto: any): Promise<void> {
    await this.commandBus.execute(new IndexBlockCommand({ ...dto }));
  }

  // public async completeIndexBlock(dto: any): Promise<void> {
  //   await this.commandBus.execute(new CompleteIndexBitcoinBlockCommand({ ...dto }));
  // }
}
