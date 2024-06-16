// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { IndexTransactionsBatchCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { Indexer } from '../models/indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import {
  BlockModelFactoryService,
  IndexerModelFactoryService,
  TransactionsBatchModelFactoryService,
} from '../services';

@CommandHandler(IndexTransactionsBatchCommand)
export class IndexTransactionsBatchCommandHandler implements ICommandHandler<IndexTransactionsBatchCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly blocksModelFactoryService: BlockModelFactoryService,
    private readonly indexerModelFactoryService: IndexerModelFactoryService,
    private readonly batchModelFactoryService: TransactionsBatchModelFactoryService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexTransactionsBatchCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId, batches } = payload;

      // TODO: we can have here transactions not all but "from to"
      // for this we need to fetch block from cache with not all tranactions
      const { tx, ...blockWithoutTx } = block;

      // TODO: move to env
      const MAX_INDEXING_BATCH_PER_ONE_TIME = 1;

      // Find no indexed batches
      const notIndexedBatches = []; // TODO: add type
      for (const [id, status] of batches) {
        if (status === 'created') {
          notIndexedBatches.push(id);
          // NOTE: We update the status to 'completed',
          // this is necessary to update batches in a block
          // without restoring the block from its state
          batches.set(id, 'completed');

          if (notIndexedBatches.length === MAX_INDEXING_BATCH_PER_ONE_TIME) {
            // NOTE: The loop exits immediately after the required number of elements is found.
            // This means that it is not always necessary to process all the elements of the collection.
            break;
          }
        }
      }

      /* Confirm block index (all batches already has been indexed)*/
      if (notIndexedBatches.length === 0) {
        this.log.debug('No batches for indexing', { notIndexedBatches }, this.constructor.name);

        // IMPORTANT: We restore the state of the block to make sure it can be completed
        const restoredBlockModel: Block = await this.blocksModelFactoryService.initExistingModel(blockWithoutTx.height);

        await restoredBlockModel.completeIndexBlock({ requestId });

        const indexerModel: Indexer = await this.indexerModelFactoryService.initModel();
        await indexerModel.confirmIndexBlock({ requestId, block: blockWithoutTx });

        await this.eventStore.save([indexerModel, restoredBlockModel]);

        await restoredBlockModel.commit();
        await indexerModel.commit();

        this.log.info(
          `Block successfull indexed`,
          {
            block: { height: blockWithoutTx.height, hash: blockWithoutTx.hash },
            alreadyIndexedLength: indexerModel.chain.lastBlockHeight,
          },
          this.constructor.name
        );
        return;
      }

      // TODO: add logic if there is only ONE batch left we confirm block index here

      /* Complete batch index logic */
      const newBlockModel: Block = this.blocksModelFactoryService.createNewModel();
      newBlockModel.aggregateId = block.hash;

      const updatedBatches = [];

      for (const batchId of notIndexedBatches) {
        // Get transactionsBatch aggregate
        const transactionsBatch: TransactionsBatch = await this.batchModelFactoryService.initExistingModel(batchId);

        // Filter the batch transactions Map to find transactions with hashes present in tx
        // TODO: add type
        // TODO: optimise
        const filteredTransactions = tx.filter((transaction: { txid: string }) =>
          transactionsBatch.transactions.has(transaction.txid)
        );

        await transactionsBatch.indexing({ transactions: filteredTransactions, requestId });

        // TODO: this needs to be optimized
        updatedBatches.push(transactionsBatch);
      }

      // Update batches in block model
      await newBlockModel.updateBatches({ batches, requestId });

      await this.eventStore.save([...updatedBatches, newBlockModel]);

      // Так как у нас по фичам могут быть за раза тут несколько батчей индексироваться
      // И потому что нам нужно сначала попробовать сохранить в базе остальные аггегтаы
      // и проверить не будет ли там исключения.
      // Поэтому мы тут в массиве публикуем ивенты всех батчей(может и один он будет)
      // (Отдельно транзакции не будут публиковаться никогда)
      for (const batch of updatedBatches) {
        await batch.commit();
      }

      await newBlockModel.commit();

      this.log.debug(`Transactions Batch successfull indexed`, { batches: notIndexedBatches }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
