import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { IndexBlockCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: process.env.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME })
  @RuntimeTracker({ showMemory: false })
  async execute({ payload }: IndexBlockCommand) {
    try {
      const { batch, requestId } = payload;

      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      await indexerModel.addBlocks({
        requestId,
        blocks: batch,
        service: this.networkProviderService,
        logger: this.log,
      });

      await this.eventStore.save(indexerModel);

      this.balancesIndexerModelFactory.updateCache(indexerModel);

      await indexerModel.commit();
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      this.balancesIndexerModelFactory.clearCache();
      throw error;
    }
  }
}
