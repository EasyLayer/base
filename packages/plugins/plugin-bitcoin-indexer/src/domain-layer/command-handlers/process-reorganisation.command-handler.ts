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

      // NOTE: blocks - need to be reorganised (from IndexerModel),
      // height - is height of reorganisation(the last height where the blocks matched)
      const { blocks, height, requestId } = payload;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: Indexer = await this.indexerModelFactory.initModel();

      this.log.debug('Init Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      const blockHashes = blocks.filter((item) => item.hash).map((item) => item.hash);
      const batchesIds = blocks.flatMap((block) => block.batches);

      const blocksModels: Block[] = await this.blockModelFactory.initExistingModels(blockHashes);
      const batchesModels: TransactionsBatch[] = await this.batchModelFactory.initExistingModels(batchesIds);

      // IMPORTANT: Since we know the aggregate IDs of blocks and batches
      // that need to be removed,
      // we don’t have to get the full state from the database,
      // but we can create new models with these ID aggregates and simply set the status to them.
      for (const block of blocks) {
        const { batches, hash } = block;

        for (const batch of batches) {
          const batchModel = batchesModels.find((b) => b.aggregateId === batch);
          if (batchModel) {
            await batchModel.suspend({ aggregateId: batch, requestId });
          }
        }

        const blockModel = blocksModels.find((b) => b.aggregateId === hash);
        if (blockModel) {
          await blockModel.suspend({ aggregateId: hash, requestId });
        }
      }

      await indexerModel.finishReorganisation({ height, requestId });

      // Save into eventstore
      await this.eventStore.save([...blocksModels, ...batchesModels, indexerModel]);

      for (const block of blocksModels) {
        await block.commit();
      }

      for (const batch of batchesModels) {
        await batch.commit();
      }

      await indexerModel.commit();

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
