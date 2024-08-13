import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BitcoinIndexerBlocksAddedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService, TransactionsReadService } from '../services';

@EventsHandler(BitcoinIndexerBlocksAddedEvent)
export class BitcoinIndexerBlocksAddedEventHandler implements IEventHandler<BitcoinIndexerBlocksAddedEvent> {
  constructor(
    private readonly blocksReadService: BlocksReadService,
    private readonly transactionsReadService: TransactionsReadService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ showMemory: false })
  async handle({ payload }: BitcoinIndexerBlocksAddedEvent) {
    try {
      const { blocks } = payload;

      const processedBlocks: any[] = [];
      const processedTx = new Map<string, any[]>();

      for (const b of blocks) {
        const { hash } = b;

        const block = await this.blocksQueueService.confirmIndexBlock(hash);

        if (!block || block.hash !== hash) {
          throw new Error(`Wrong block ${hash}`);
        }

        const { tx, ...blockWithoutTx } = block;

        if (!tx || tx.length === 0) {
          throw new Error(`Tx length = 0`);
        }

        tx.forEach((t: any) => {
          if (!processedTx.has(hash)) {
            processedTx.set(hash, []);
          }

          processedTx.get(hash)!.push(t);
        });

        processedBlocks.push(blockWithoutTx);
      }

      if (processedBlocks.length > 0) {
        await this.blocksReadService.createMany(processedBlocks);

        if (processedTx.size > 0) {
          await this.transactionsReadService.createMany(processedTx);
        }
      }
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError;
        if (driverError.code === 'SQLITE_CONSTRAINT') {
          throw new Error(driverError.message);
        }
        if (driverError.code === '23505') {
          throw new Error(driverError.detail);
        }
      }

      throw error;
    }
  }
}
