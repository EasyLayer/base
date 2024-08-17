import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitIndexerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: BalancesIndexerModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-eventstore' })
  @RuntimeTracker({ showMemory: true })
  async execute({ payload }: InitIndexerCommand) {
    try {
      const { requestId, lastReadStateHeight } = payload;

      const restoreBlocks: string[] = [];

      this.log.info('Init BalancesIndexer Aggregate...', null, this.constructor.name);

      const indexerModel: BalancesIndexer = await this.indexerModelFactory.initModel();

      this.log.info('BalancesIndexer Aggregate successfully initialized.', null, this.constructor.name);

      if (indexerModel.status === 'awaiting' && lastReadStateHeight !== undefined) {
        const restoreBlocksCount = indexerModel.chain.lastBlockHeight - lastReadStateHeight;

        this.log.info(
          'Synchronization of blocks between write and read states starting...',
          { restoreBlocksCount },
          this.constructor.name
        );

        // NOTE: We want to restore events one block more than the difference between write and read state.
        const blocks = indexerModel.chain.getLastNBlocks(restoreBlocksCount + 1);

        this.log.info(
          'Synchronization of blocks between write and read states was finished',
          null,
          this.constructor.name
        );

        // For restore block in read state we publish indexer with blocks hashes
        blocks.forEach((item) => restoreBlocks.push(item.hash));
      }

      if (indexerModel.status === 'reorganisation') {
        this.log.info('Reorganisation of blocks was started...', null, this.constructor.name);
        // Publish last indexer event to process reorganisation
        await this.indexerModelFactory.publishLastEvent();

        this.log.info('Reorganisation of blocks was finished.', null, this.constructor.name);
      }

      await indexerModel.init({
        requestId,
        restoreBlocks,
      });

      await this.eventStore.save(indexerModel);
      await indexerModel.commit();

      this.log.info('Aggregates successfull init', null, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
