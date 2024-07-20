import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore';
import { EventStoreRepository } from '@easylayer/eventstore';
import { ProcessReorganisationCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { Transaction } from '../models/transaction.model';
import { TransactionModelFactoryService, BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(ProcessReorganisationCommand)
export class ProcessReorganisationCommandHandler implements ICommandHandler<ProcessReorganisationCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly transactionModelFactory: TransactionModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: ProcessReorganisationCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: block - from Blockchain structure
      // height - reorganisation height
      const { block, height, requestId } = payload;
      const { batches, height: blockHeight, hash: blockHash } = block;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Check Finish Reorganisation */
      if (block.height === height) {
        // Reorganisation has already finished
        await indexerModel.finishReorganisation({ height, requestId });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        return;
      }

      const transactionModels: Transaction[] = [];

      // NOTE: Now we are rolling back all the batches of a block at once;
      // if this becomes a performance bottleneck, we will need to roll back one batch at a time.
      for (const batch of batches) {
        const { tx } = batch;

        for (const t of tx) {
          const { txid, /*vin,*/ vout } = t;

          // Deleting outputs that were previously indexed
          const removedUTXO: Transaction = this.transactionModelFactory.createNewModel();
          await removedUTXO.delete({ aggregateId: txid, vout, requestId, blockHeight, blockHash });
          transactionModels.push(removedUTXO);

          // We unspent all inputs from transactions that were previously spent
          // for (const input of vin) {
          //   const unspentedUTXO: Transaction = this.transactionModelFactory.createNewModel();
          //   const voutIndex = input.vout ? input.vout : -1; // -1 mean coinbase tx
          //   await unspentedUTXO.unspent({ aggregateId: input.txid, voutIndex, requestId });
          //   transactionModels.push(unspentedUTXO);
          // }
        }
      }

      await indexerModel.truncateByBlock({
        height, // reorganisation height
        block, // block need to be truncate
        requestId,
      });

      await this.eventStore.save([...transactionModels, indexerModel]);

      for (const t of transactionModels) {
        await t.commit();
      }

      await indexerModel.commit();
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
