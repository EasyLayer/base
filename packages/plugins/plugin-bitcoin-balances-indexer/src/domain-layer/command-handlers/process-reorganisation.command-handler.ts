import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore';
import { EventStoreRepository } from '@easylayer/eventstore';
import { ProcessReorganisationCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/logger';
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
  async execute({ payload }: ProcessReorganisationCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: blocks - need to be reorganised (from BalancesIndexerModel),
      // height - is height of reorganisation(the last height where the blocks matched)
      const { blocks, height, requestId } = payload;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

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
      this.log.error('execute()', { error }, this.constructor.name);
      throw error;
    }
  }

  private sortByIndex(batches: TransactionsBatch[]): TransactionsBatch[] {
    return batches.sort((a, b) => b.batch.n - a.batch.n);
  }
}
