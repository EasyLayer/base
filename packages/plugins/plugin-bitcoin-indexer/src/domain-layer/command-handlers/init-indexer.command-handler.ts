import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitIndexerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { AppLogger } from '@easylayer/components/logger';
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

      const { requestId, startHeight, restoreFromHeight } = payload;

      const indexerModel: Indexer = await this.indexerModelFactory.initModel();
      await indexerModel.init({
        requestId,
        startHeight,
      });

      if (indexerModel.status === 'awaiting' && restoreFromHeight) {
        const restoreBlocksCount = indexerModel.chain.lastBlockHeight - restoreFromHeight;
        const blocks = indexerModel.chain.getLastNBlocks(restoreBlocksCount);

        this.log.info('Index Aggregate restore blocks staring...', { restoreBlocksCount }, this.constructor.name);

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
