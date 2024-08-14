import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { BitcoinIndexerInitializedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService, TransactionsReadService } from '../services';

@EventsHandler(BitcoinIndexerInitializedEvent)
export class BitcoinIndexerInitializedEventHandler implements IEventHandler<BitcoinIndexerInitializedEvent> {
  constructor(
    private readonly blocksReadService: BlocksReadService,
    private readonly transactionsReadService: TransactionsReadService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @Transactional({ connectionName: 'indexer-views' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinIndexerInitializedEvent) {
    try {
      const { restoreBlocks, indexedHeight } = payload;

      const processedBlocks: any[] = [];
      const processedTx = new Map<string, any[]>();

      for (const hash of restoreBlocks) {
        // Fetch block with tx from provider
        const block = await this.networkProviderService.getOneBlockByHash(hash, 2);

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

      // IMPORTANT: We will only start loading to the blocks queue after the restoration of the Read State
      // TODO: move it from here
      this.blocksQueueService.start(indexedHeight);
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
