// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { InitIndexerCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/components/logger';
import { AppConfig } from '../../config';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { BalancesIndexerModelFactoryService, TransactionsBatchModelFactoryService } from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly appConfig: AppConfig,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: InitIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId, startHeight } = payload;

      const indexerModel: BalancesIndexer = await this.indexerModelFactory.initModel();
      await indexerModel.init({
        requestId,
        startHeight,
      });

      if (indexerModel.status === 'awaiting') {
        // Get last blocks from IndexerModel
        const blocks = indexerModel.chain.getLastNBlocks(
          this.appConfig.BITCOIN_BALANCES_INDEXER_START_INIT_REPUBLISH_BLOCKS_COUNT
        );

        this.log.debug(
          'Index Aggregate last blocks init staring...',
          { blocksLength: blocks.length },
          this.constructor.name
        );

        for (const block of blocks) {
          console.log('DDDDDD\n\n\n\n');
          const { batches } = block;
          for (const batchId of batches) {
            // Publish last batch event
            await this.batchModelFactory.publishLastEvent(batchId);
          }
        }
      }

      if (indexerModel.status === 'reorganisation') {
        console.log('2DDDDDD\n\n\n\n');
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
