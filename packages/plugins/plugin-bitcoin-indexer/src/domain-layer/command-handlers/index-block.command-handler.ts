// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { IndexBlockCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { Indexer } from '../models/indexer.model';
import { IndexerModelFactoryService } from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  @RuntimeTracker({ showMemory: false })
  async execute({ payload }: IndexBlockCommand) {
    try {
      const { batch, requestId } = payload;

      const indexerModel: Indexer = await this.indexerModelFactory.initModel();

      await indexerModel.addBlocks({
        requestId,
        blocks: batch,
        service: this.networkProviderService,
        logger: this.log,
      });

      await this.eventStore.save(indexerModel);

      this.indexerModelFactory.updateCache(indexerModel);

      await indexerModel.commit();
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      this.indexerModelFactory.clearCache();
      throw error;
    }
  }
}
