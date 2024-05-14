// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { IndexTransactionsBatchCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { TransactionsBatch } from '../models/transactions-batch';
import {
  BlockModelFactoryService,
  NetworkModelFactoryService,
  TransactionsBatchModelFactoryService,
} from '../services';

@CommandHandler(IndexTransactionsBatchCommand)
export class IndexTransactionsBatchCommandHandler
  implements ICommandHandler<IndexTransactionsBatchCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly blocksModelFactoryService: BlockModelFactoryService,
    private readonly networkModelFactoryService: NetworkModelFactoryService,
    private readonly batchModelFactoryService: TransactionsBatchModelFactoryService,
    private readonly eventStore: EventStoreRepository,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexTransactionsBatchCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId } = payload;

      // TODO: we can have here transactions not all but "from to"
      // for this we need to fetch block from cache with not all tranactions
      const { tx, ...lightweightBlock } = block;

      // NOTE: JS treats the 0 heigth as false, so we call it 'genesis'
      const blockModel: Block =
        await this.blocksModelFactoryService.initExistingModel(block.height || 'genesis');

        const { batches } = blockModel;

      const MAX_INDEXING_BATCH_PER_ONE_TIME = 1;

      /* Find no indexed batches */
      const notIndexedBatches = []; // TODO: add type
      for (let [id, status] of batches) {
        if (status === 'created') {
          notIndexedBatches.push(id);
          if (notIndexedBatches.length === MAX_INDEXING_BATCH_PER_ONE_TIME) {
            // NOTE: The loop exits immediately after the required number of elements is found. 
            // This means that it is not always necessary to process all the elements of the collection.
            break;
          }
        }
      }

      // TODO: process the option if this is the last batch, then immediately indicate that the block is indexed
      // (тут прикольно то что мы сразу первый батч обработает и если мы размер батча так укажем что 
        // он захватит все транзы, то получиться что мы тут же и проиндексируем это все.)

      /* Complete block index logic */
      if (notIndexedBatches.length === 0) {
        this.log.debug('No batches for indexing', { notIndexedBatches }, this.constructor.name);

        await blockModel.completeIndexBlock({ requestId, batches });

        const networkModel: Network = await this.networkModelFactoryService.initModel();
        await networkModel.confirmIndexBlock({ requestId, block: lightweightBlock });

        await this.eventStore.save([networkModel, blockModel]);

        await blockModel.commit();
        await networkModel.commit();

        this.log.debug(`Block successfull indexed`, { block: lightweightBlock }, this.constructor.name);
        return;
      }

      const updatedBatches = [];

      for (const batchId of notIndexedBatches) {
        // Get transactionsBatch aggregate
        const transactionsBatch: TransactionsBatch = await this.batchModelFactoryService.initExistingModel(batchId);

        // Filter the batch transactions Map to find transactions with hashes present in tx (O(1))
        // TODO: add type
        // TODO: optimise
        const filteredTransactions = tx.filter((transaction: { hash: string }) => transactionsBatch.transactions.has(transaction.hash));

        await transactionsBatch.index({ transactions: filteredTransactions, requestId });

        // TODO: this needs to be optimized
        updatedBatches.push(transactionsBatch);
      }

      // Update batches in block model
      await blockModel.updateBatches({ batchesHashes: updatedBatches.map(item => item.aggregateId), requestId });

      await this.eventStore.save([...updatedBatches, blockModel]);

      // Так как у нас по фичам могут быть за раза тут несколько батчей индексироваться
      // И потому что нам нужно сначала попробовать сохранить в базе остальные аггегтаы
      // и проверить не будет ли там исключения. 
      // Поэтому мы тут в массиве публикуем ивенты всех батчей(может и один он будет)
      // (Отдельно транзакции не будут публиковаться никогда)
      for (let batch of updatedBatches) {
        await batch.commit();
      }

      await blockModel.commit();

      this.log.debug(`Transactions Batch successfull indexed`, { batches: notIndexedBatches }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
