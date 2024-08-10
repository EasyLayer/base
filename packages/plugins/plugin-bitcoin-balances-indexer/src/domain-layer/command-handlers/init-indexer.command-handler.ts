// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitIndexerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/components/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService, TransactionsBatchModelFactoryService } from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: InitIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId, startHeight, restoreFromHeight } = payload;

      const indexerModel: BalancesIndexer = await this.indexerModelFactory.initModel();
      await indexerModel.init({
        requestId,
        startHeight,
      });

      if (indexerModel.status === 'awaiting' && restoreFromHeight) {
        const restoreBlocksCount = indexerModel.chain.lastBlockHeight - restoreFromHeight;
        const blocks = indexerModel.chain.getLastNBlocks(restoreBlocksCount);

        this.log.info('Index Aggregate restore blocks staring...', { restoreBlocksCount }, this.constructor.name);

        for (const block of blocks) {
          const { batches } = block;
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

      this.log.info('Aggregates successfull init', {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
