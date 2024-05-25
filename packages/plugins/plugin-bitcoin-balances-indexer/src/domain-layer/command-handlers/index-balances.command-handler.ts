// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { IndexBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { Wallet } from '../models/wallet.model';
import { BalancesIndexer } from '../models/balances-indexer.model';
import {
  WalletModelFactoryService,
  BalancesIndexerModelFactoryService,
} from '../services';

@CommandHandler(IndexBalancesCommand)
export class IndexBalancesCommandHandler
  implements ICommandHandler<IndexBalancesCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly walletModelFactory: WalletModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly eventStore: EventStoreRepository,
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: IndexBalancesCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { batch, requestId } = payload;
      const { blockHash, blockHeight, index, status, ...restBatch } = batch;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      // /* Reorganisation */
      // if (!indexerModel.chain.validateNextBatch(blockHeight, blockHash, index)) {
      //   // Тут мы делаем все тоже самое только балансы должны обновить? Потому как это блок который уже был? 
        

      //   await indexerModel.reorganisation({ height, requestId, service: this.networkProviderService });
      //   await this.eventStore.save(indexerModel);
      //   await indexerModel.commit();
      //   this.log.debug(`Balances Indexer reorganisation started`, {}, this.constructor.name);
      //   return;
      // }


      /* Batch Indexing */


      /* Batch Indexing with confirmation */


      // TODO: we can have here transactions not all but "from to"
      // for this we need to fetch block from cache with not all tranactions
      const { tx, ...lightweightBlock } = block;

      // NOTE: JS treats the 0 heigth as false, so we call it 'genesis'
      const blockModel: Block =
        await this.blocksModelFactoryService.initExistingModel(block.height || 'genesis');

        const { batches } = blockModel;

      // TODO: move to env
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

      /* Complete block index logic */
      if (notIndexedBatches.length === 0) {
        this.log.debug('No batches for indexing', { notIndexedBatches }, this.constructor.name);

        await blockModel.completeIndexBlock({ requestId });

        const indexerModel: Indexer = await this.indexerModelFactoryService.initModel();
        await indexerModel.confirmIndexBlock({ requestId, block: lightweightBlock });

        await this.eventStore.save([indexerModel, blockModel]);

        await blockModel.commit();
        await indexerModel.commit();

        this.log.info(`Block successfull indexed`, {
          block: { height: lightweightBlock.height, hash: lightweightBlock.hash },
          alreadyIndexedLength: indexerModel.chain.lastBlockHeight
        }, this.constructor.name);
        return;
      }

      const updatedBatches = [];

      for (const batchId of notIndexedBatches) {
        // Get transactionsBatch aggregate
        const transactionsBatch: TransactionsBatch = await this.batchModelFactoryService.initExistingModel(batchId);

        // Filter the batch transactions Map to find transactions with hashes present in tx (O(1))
        // TODO: add type
        // TODO: optimise
        const filteredTransactions = tx.filter((transaction: { txid: string }) => transactionsBatch.transactions.has(transaction.txid));

        await transactionsBatch.indexing({ transactions: filteredTransactions, requestId });

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
