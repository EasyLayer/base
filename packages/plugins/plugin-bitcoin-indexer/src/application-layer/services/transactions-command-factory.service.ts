// import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@easylayer/cqrs';
import {
  IndexTransactionsBatchCommand,
} from '@easylayer/domain-cqrs-components/bitcoin';
import { BlocksQueueService } from '../blocks-queue';

@Injectable()
export class TransactionsCommandFactoryService {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  public async indexTransactionsBatch(dto: any): Promise<void> {
    const { block } = dto;

    // Get block with transactions from cache
    const blockWithTransactions = await this.blocksQueueService.getOneBlockByHeight(block.height);
    await this.commandBus.execute(new IndexTransactionsBatchCommand({
      ...dto,
      block: blockWithTransactions,
    }));
  }
}
