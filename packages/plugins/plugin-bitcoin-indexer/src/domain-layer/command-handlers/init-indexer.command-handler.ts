import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { AppLogger } from '@easylayer/logger';
import { Indexer } from '../models/indexer.model';
import { IndexerModelFactoryService, BlockModelFactoryService } from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly blocksModelFactory: BlockModelFactoryService
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

      // Publish last block event (if its exist)
      const lastBlockAggregateId = String(indexerModel.chain.lastBlockHash);
      if (lastBlockAggregateId) {
        await this.blocksModelFactory.publishLastEvent(lastBlockAggregateId);

        // TODO: add transactionsBatch publish last events
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
