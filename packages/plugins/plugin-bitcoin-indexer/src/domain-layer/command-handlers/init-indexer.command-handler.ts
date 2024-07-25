import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { AppLogger } from '@easylayer/logger';
import { Indexer } from '../models/indexer.model';
import { AppConfig } from '../../config';
import {
  IndexerModelFactoryService,
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
} from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly appConfig: AppConfig,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly blocksModelFactory: BlockModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: InitIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId, startHeight } = payload;

      const indexerModel: Indexer = await this.indexerModelFactory.initModel();
      await indexerModel.init({
        requestId,
        startHeight,
      });

      // Publish last indexer event to process reorganisation
      await this.indexerModelFactory.publishLastEvent();

      if (indexerModel.status === 'awaiting') {
        // Get last blocks from IndexerModel
        const blocks = indexerModel.chain.getLastNBlocks(
          this.appConfig.BITCOIN_INDEXER_START_INIT_REPUBLISH_BLOCKS_COUNT
        );

        this.log.debug(
          'Index Aggregate last blocks init staring...',
          { blocksLength: blocks.length },
          this.constructor.name
        );

        for (const block of blocks) {
          const { hash, batches } = block;

          // Publish last block event
          await this.blocksModelFactory.publishLastEvent(hash);

          for (const batchId of batches) {
            // Publish last batch event
            await this.batchModelFactory.publishLastEvent(batchId);
          }
        }
      }

      if (indexerModel.status === 'reorganisation') {
        // Publish last indexer event to process reorganisation
        await this.indexerModelFactory.publishLastEvent();
      }

      await this.eventStore.save(indexerModel);
      await indexerModel.commit();

      this.log.debug('Aggregates successfull init', {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
