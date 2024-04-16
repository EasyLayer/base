import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { IndexBitcoinTransactionsBatchCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { TransactionsPool } from '../models/transactions-pool.model';
import {
  BitcoinTransactionsBatchModelFactoryService,
  BitcoinTransactionsPoolModelFactoryService,
  BitcoinTransactionModelFactoryService,
} from '../services';
import { TransactionsBatch } from '../models/transactions-batch';
import { Transaction } from '../models/transaction.model';

@CommandHandler(IndexBitcoinTransactionsBatchCommand)
export class IndexBitcoinTransactionsBatchCommandHandler
  implements ICommandHandler<IndexBitcoinTransactionsBatchCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly poolModelFactoryService: BitcoinTransactionsPoolModelFactoryService,
    private readonly batchModelFactoryService: BitcoinTransactionsBatchModelFactoryService,
    private readonly txModelFactoryService: BitcoinTransactionModelFactoryService,
    private readonly networkProvider: BitcoinNetworkProviderService
  ) {}

  async execute({ payload }: IndexBitcoinTransactionsBatchCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { transactionsPoolId, blockId } = payload;

      const transactionPool: TransactionsPool =
        await this.poolModelFactoryService.initExistingModel(transactionsPoolId);

      const MAX_INDEXING_BATCH_PER_ONE_TIME = 1;

      let { batches } = transactionPool;

      // In theory, we can transfer all this to the model
      // supposedly there will be such a big method in the model, although NO,
      // I have a lot of units here,
      const notIndexedBatches = batches
        .filter((batch) => batch.status === 'created')
        .slice(0, MAX_INDEXING_BATCH_PER_ONE_TIME);

      if (notIndexedBatches.length === 0) {
        await transactionPool.update({ batches, status: 'completed' });
      } else {
        for (const batch of notIndexedBatches) {
          // Get transactions from blockchain
          const transactions = await this.networkProvider.getManyTransactionsByHashes(batch.tx);
          // Create each transaction
          for (const transaction of transactions) {
            const tx: Transaction = this.txModelFactoryService.createNewModel();

            await tx.create({ aggregateId: uuidv4(), blockId, transaction });
            await tx.commit(true);

            //save into db

            // Here we can add some basic transaction data to the package.
            // So that the event contains some basic information and does not go into the blockchain additionally
          }

          const indexedBatch: TransactionsBatch = await this.batchModelFactoryService.initExistingModel(
            batch.aggregateId
          );
          await indexedBatch.index({ aggregateId: indexedBatch.aggregateId, status: 'indexed' });
          await indexedBatch.commit(true);

          //save into db

          batches = [...batches, batch];
        }

        await transactionPool.update({ batches, status: 'in_process' });
      }

      //save into db

      await transactionPool.commit();

      this.log.debug(`Transactions Batch successfull indexed`, {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
