// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { InitIndexerCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Indexer } from '../models/indexer.model';
import { Block } from '../models/block.model';
// import { TransactionsBatch } from '../models/transactions-batch.model';
import {
  IndexerModelFactoryService,
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
} from '../services';

@CommandHandler(InitIndexerCommand)
export class InitIndexerCommandHandler implements ICommandHandler<InitIndexerCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly blocksModelFactory: BlockModelFactoryService,
    private readonly batchesModelFactory: TransactionsBatchModelFactoryService
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: InitIndexerCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { requestId } = payload;

      const indexerModel: Indexer = await this.indexerModelFactory.initModel();
      await indexerModel.init({ requestId });

      if (indexerModel.status === 'indexing' || indexerModel.status === 'awaiting') {
        // Publish last block event and last transactions batch (if its exist)
        const lastBlockAggregateId = String(indexerModel.chain.lastBlockHash);
        if (lastBlockAggregateId) {
          // Publish last block event
          await this.blocksModelFactory.publishLastEvent(lastBlockAggregateId);
          const blockModel: Block = await this.blocksModelFactory.initExistingModel(lastBlockAggregateId);
          if (blockModel) {
            const lastBatchAggregateId = String(blockModel.lastBatch?.aggregateId);
            if (lastBatchAggregateId) {
              // Publish last batch event
              await this.batchesModelFactory.publishLastEvent(lastBatchAggregateId);
            }
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
