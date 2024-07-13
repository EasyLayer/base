import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { ProcessReorganisationCommand } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { AppLogger } from '@easylayer/logger';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Block } from '../models/block.model';
import { Indexer } from '../models/indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import {
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
  IndexerModelFactoryService,
} from '../services';

@CommandHandler(ProcessReorganisationCommand)
export class ProcessReorganisationCommandHandler implements ICommandHandler<ProcessReorganisationCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly blockModelFactory: BlockModelFactoryService,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: ProcessReorganisationCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: blocks - need to be reorganised,
      // height - is height of reorganisation(the last height where the blocks matched)
      const { blocks, height, requestId } = payload;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: Indexer = await this.indexerModelFactory.initModel();

      this.log.debug('Init Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      const blocksModels: Block[] = [];
      const batchesModels: TransactionsBatch[] = [];

      // IMPORTANT: Since we know the aggregate IDs of blocks and batches
      // that need to be removed,
      // we don’t have to get the full state from the database,
      // but we can create new models with these ID aggregates and simply set the status to them.
      for (const block of blocks) {
        const { batches, hash } = block;

        for (const batch of batches) {
          const batchModel: TransactionsBatch = this.batchModelFactory.createNewModel();
          await batchModel.suspend({ aggregateId: batch, requestId });
          batchesModels.push(batchModel);
        }

        const blockModel: Block = this.blockModelFactory.createNewModel();
        await blockModel.suspend({ aggregateId: hash, requestId });
        blocksModels.push(blockModel);
      }

      await indexerModel.finishReorganisation({ height: BigInt(height), requestId });

      // Save into eventstore
      await this.eventStore.save([...blocksModels, ...batchesModels, indexerModel]);

      await indexerModel.commit();

      // TODO: think about what we need to publish here, necessarily
      //   for (const batch of batchesModels) {
      //     await batch.commit();
      //   }

      for (const block of blocksModels) {
        await block.commit();
      }

      this.log.debug(
        `Blockchain successfull reorganised`,
        {
          lastBlockHeight: indexerModel.chain.lastBlockHeight,
        },
        this.constructor.name
      );
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
