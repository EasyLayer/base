// import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
// import { CommandBus } from '@easylayer/cqrs';
// import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

@Injectable()
export class BlocksCommandFactoryService {
  constructor() {} // private readonly commandBus: CommandBus

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async indexBlock(dto: any): Promise<void> {
    console.log('INDEX BLOCK BALANCES INDEXER');
    // await this.commandBus.execute(new IndexBlockCommand({ ...dto }));
  }
}
