import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { CreateBitcoinTransactionsPoolCommand } from '@easylayer/domain-cqrs-components';
import { AppLogger } from '@easylayer/logger';
import { TransactionsPool } from '../../../domain-layer/models/transactions-pool.model';
import { BitcoinTransactionsBatchModelFactoryService, BitcoinTransactionsPoolModelFactoryService } from '../services';
import { TransactionsBatch } from '../../../domain-layer/models/transactions-batch';

@CommandHandler(CreateBitcoinTransactionsPoolCommand)
export class CreateBitcoinTransactionsPoolCommandHandler
  implements ICommandHandler<CreateBitcoinTransactionsPoolCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly eventStore: EventStoreRepository,
    private readonly poolModelFactoryService: BitcoinTransactionsPoolModelFactoryService,
    private readonly batchModelFactoryService: BitcoinTransactionsBatchModelFactoryService,
    private readonly networkProvider: BitcoinNetworkProviderService
  ) {}

  @Transactional({ connectionName: 'transactions-write' })
  async execute({ payload }: CreateBitcoinTransactionsPoolCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { blockId } = payload;

      const { tx } = await this.networkProvider.getOneBlockByHash(blockId);

      const batches: any = [];

      // TODO: move into env
      const MAX_TRANSACTIONS_PER_BATCH = 100;

      /* Create transactions batches */
      while (tx.length > 0) {
        // Extract a pack of transactions, removing them from the copy of the array
        // IMPORTANT: transactions in the block are arranged in order
        // when splitting into batches we must follow this order!!
        // (this is because in one block in different transactions there can be the same wallets
        // and we must take into account the inputs and outputs of all transactions...)
        const batch = tx.splice(0, MAX_TRANSACTIONS_PER_BATCH);

        // Создаем модель пака
        const transactionBatch: TransactionsBatch = this.batchModelFactoryService.createNewModel();

        await transactionBatch.create({
          aggregateId: uuidv4(),
          transactionsPoolId: blockId, // Save as blockId
          transactions: batch,
          blockId,
        });

        // save into db
        await this.eventStore.save(transactionBatch);

        batches.push(transactionBatch);
      }

      // Create a new aggregator pool
      const transactionPool: TransactionsPool = this.poolModelFactoryService.createNewModel();
      await transactionPool.create({
        aggregateId: blockId,
        batches: batches.map((item: TransactionsBatch) => ({ id: item.aggregateId, status: 'created' })),
        blockId,
        // status: 'indexing'
      });

      //save transactionPool into db
      await this.eventStore.save(transactionPool);

      // commit batches with skip publishing
      for (const batch of batches) {
        await batch.commit(true);
      }

      // We end this method by publishing the pool creation event with all the package IDs
      // This event will be published on transport.
      // This event will listen to the block to update its status.
      // If there are problems when saving to the database, then all packages will not be created either
      await transactionPool.commit();

      this.log.debug(`Transactions Pool successfull created`, {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
