import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitIndexerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/components/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: BalancesIndexerModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: InitIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId, startHeight, restoreFromHeight } = payload;

      const restoreBlocks: string[] = [];

      const indexerModel: BalancesIndexer = await this.indexerModelFactory.initModel();

      if (indexerModel.status === 'awaiting' && restoreFromHeight) {
        const restoreBlocksCount = indexerModel.chain.lastBlockHeight - restoreFromHeight;
        const blocks = indexerModel.chain.getLastNBlocks(restoreBlocksCount);
        // For restore block in read state we publish indexer with blocks hashes
        blocks.forEach((item) => restoreBlocks.push(item.hash));
        console.log(indexerModel.chain.lastBlockHeight, restoreFromHeight);
      }

      if (indexerModel.status === 'reorganisation') {
        // Publish last indexer event to process reorganisation
        await this.indexerModelFactory.publishLastEvent();
      }

      await indexerModel.init({
        requestId,
        startHeight,
        restoreBlocks,
      });

      await this.eventStore.save(indexerModel);
      await indexerModel.commit();

      this.log.info('Aggregates successfull init', {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
