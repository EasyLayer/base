import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { IndexTransactionsBatchCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { TransactionsBatch } from '../models/transactions-batch';
import { Transaction } from '../models/transaction.model';
import {
  BlockModelFactoryService,
  NetworkModelFactoryService,
  TransactionsBatchModelFactoryService,
  TransactionModelFactoryService
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
    private readonly txsModelFactoryService: TransactionModelFactoryService,
    private readonly networkEventStore: EventStoreRepository<Network>,
    private readonly blocksEventStore: EventStoreRepository<Block>,
    private readonly batchesEventStore: EventStoreRepository<TransactionsBatch>,
    private readonly txsEventStore: EventStoreRepository<Transaction>,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexTransactionsBatchCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, batches, requestId } = payload;

      // TODO: we can have here transactions not all but "from to"
      // for this we need to fetch block from cache with not all tranactions
      const { tx, ...lightweightBlock } = block;
      // Если мы полчим batches в команду, т опо сути нам не нужно на этом этапе доставать блок с состояния так??
      // Нам все ровно нужно обновить состояние блока указав что мы проиндексировали конкретный батч. 
      // Ну тут еще мы можем 
      // или не сохранять состояние пока все не проиндексируються а если будет ошибка то будем поновой все батчи индексировать
      // или мы можем взять модуь блока с айди где высота и перезаписать его, перезаписать получаеться с обновленным списком
      // batches, только нужно думать над синхронизацией. 
      // РЕШЕНИЯ: ТУТ Я ОСТАВЛЮ КАК МЕСТО ОПТИМИЗАЦИИ (если что batches будем передавать просто пока будем брать с блока)

      const blockModel: Block =
        await this.blocksModelFactoryService.initExistingModel(block.height);

      const MAX_INDEXING_BATCH_PER_ONE_TIME = 1;

      /* Find no indexed batches */
      const notIndexedBatches = []; // TODO: add type
      for (let [id, status] of blockModel.batches) {
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

      if (notIndexedBatches.length === 0) {
        // Тут мы должны обнвоить блок, и network 
        // await transactionPool.update({ batches, status: 'completed' });
        // и должны опубликовать события на которые будет подписана Сага и сможет удалить блок с очереди
        const networkModel: Network = await this.networkModelFactoryService.initByExtraModel();
        // await blockModel.completeIndexBlock(); ???
        await networkModel.confirmIndexBlock({ requestId, block: lightweightBlock })

        this.log.debug(`Block successfull indexed`, {}, this.constructor.name);
        return;
      }

      for (const batchId of notIndexedBatches) {
        // Get transactionsBatch aggregate
        const transactionsBatch: TransactionsBatch = await this.batchModelFactoryService.initExistingModel(batchId);

        // Filter the tx Set to find transactions with hashes present in txHashes (O(1))
        const filteredTransactions = tx.filter((transaction: any) => transactionsBatch.transactions.has(transaction.hash));

        // Create each transaction
        for (const transaction of filteredTransactions) {
          const t: Transaction = this.txsModelFactoryService.createNewModel();

          await t.create({ aggregateId: transaction.hash, blockId: transaction.blockId, transaction });

          //save into db
          await this.txsEventStore.save(t);

          // TODO: think if we need to publish event for each Transaction? 
          // We dont have to publish eash transaction 
          // but we have to make sure that TransactionsBatch publis with all neccesary date
          // await t.commit();

          // Here we can add some basic transaction data to the package.
          // So that the event contains some basic information and does not go into the blockchain additionally
        }

        // TODODODODODODO
        await transactionsBatch.index({ aggregateId: indexedBatch.aggregateId, status: 'indexed' });

        //save into db
        await this.eventStore.save(indexedBatch);

        await indexedBatch.commit(true);

        batches = [...batches, batch];
      }

      await transactionPool.update({ batches, status: 'in_process' });

      //save into db
      await this.eventStore.save(transactionPool);

      await transactionPool.commit();

      this.log.debug(`Transactions Batch successfull indexed`, {}, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
