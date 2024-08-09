import { CommandHandler, ICommandHandler } from '@easylayer/core/cqrs';
import { Transactional, EventStoreRepository } from '@easylayer/core/eventstore';
import { ProcessReorganisationCommand } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import { TransactionsBatchModelFactoryService, BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(ProcessReorganisationCommand)
export class ProcessReorganisationCommandHandler implements ICommandHandler<ProcessReorganisationCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  @RuntimeTracker({ showMemory: true })
  async execute({ payload }: ProcessReorganisationCommand) {
    try {
      // NOTE: blocks - need to be reorganised (from BalancesIndexerModel),
      // height - is height of reorganisation(the last height where the blocks matched)
      const { blocks, height, requestId } = payload;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();
      const batchesIds = blocks.flatMap((block: any) => block.batches);
      const batchesModels: TransactionsBatch[] = await this.batchModelFactory.initExistingModels(batchesIds);

      // IMPORTANT: We must roll back batches in a certain order, namely from the end
      const sortedBatches = this.sortByIndex(batchesModels);

      for (const batch of sortedBatches) {
        await batch.suspend({ requestId });
      }

      await indexerModel.finishReorganisation({ height, requestId });

      // Save into eventstore
      await this.eventStore.save([...batchesModels, indexerModel]);

      this.balancesIndexerModelFactory.updateCache(indexerModel);

      for (const batch of batchesModels) {
        await batch.commit();
      }

      await indexerModel.commit();

      this.log.info(
        `Blockchain successfull reorganised to height`,
        {
          lastBlockHeight: indexerModel.chain.lastBlockHeight,
        },
        this.constructor.name
      );
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      this.balancesIndexerModelFactory.clearCache();
      throw error;
    }
  }

  private sortByIndex(batches: TransactionsBatch[]): TransactionsBatch[] {
    return batches.sort((a, b) => b.batch.n - a.batch.n);
  }
}
