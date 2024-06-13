import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import {
  BitcoinNetworkProviderService,
} from '@easylayer/bitcoin-network-provider';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Block } from '../models/block.model';
import { Indexer } from '../models/indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import {
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
  IndexerModelFactoryService
} from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BlockModelFactoryService,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId } = payload;

      // TODO: For this command, you need to get a block in which only hashes will be transferred.
      const { tx, ...blockWithoutTx } = block; 
      const { height, hash, previousblockhash } = blockWithoutTx;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: Indexer = await this.indexerModelFactory.initModel();

      this.log.debug('Init Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Reorganisation */
      // IMPORTANT: We do this check here, and not inside the aggregate,
      // because we don’t want to throw an error and process it
      if (!indexerModel.chain.validateNextBlock(height, previousblockhash)) {
        await indexerModel.reorganisation({
          height,
          requestId,
          service: this.networkProviderService,
          blocks: []
        });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        this.log.debug(`Indexer reorganisation started`, {}, this.constructor.name);
        return;
      }

      /* Start indexing block */
      // IMPORTANT: We do not check whether a block with such a hash exists in the state,
      // but overwrite the state if so
      const blockModel: Block = this.modelFactory.createNewModel();

      // TODO: move into env
      const MAX_TRANSACTIONS_PER_BATCH = 1000;

      const batches = [];

      this.log.info('Transactions lenght', { length: tx.length }, this.constructor.name);

      // Slice transactions by batches and start index it
      if (tx.lenght > MAX_TRANSACTIONS_PER_BATCH) {
        let index = 0;

        while (tx.length > 0) {
          // Extract a batch of transactions, removing them from the copy of the array
          // IMPORTANT: transactions in the block are arranged in order
          // when splitting into batches we must follow this order. 
          const transactionSlice = tx.splice(0, MAX_TRANSACTIONS_PER_BATCH);
  
          // TODO: add type
          // IMPORTANT: Here we just get the txid and put them in the array of non-indexed transactions.
          // that because we don't want to send all transactions by Transport, so we will get it from cache
          const transactionSliceIds: string[] = transactionSlice.map((transaction: { txid: string }) => transaction.txid);
          const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();

          // Check if this is the last batch
          const isFinalBatch = tx.length === 0;
          
          await transactionBatch.create({
            aggregateId: uuidv4(),
            requestId,
            transactionIds: transactionSliceIds,
            blockHeight: height,
            blockHash: hash,
            index,
            isFinalBatch
          });
  
          batches.push(transactionBatch);

          index++;
        }
      } else {
        // NOTE: Case when we have single batch
        // we indexing it immediately 
        const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();
        await transactionBatch.createWithIndexing({
          aggregateId: uuidv4(),
          requestId,
          transactions: tx,
          blockHeight: height,
          blockHash: hash,
          isFinalBatch: true,
          index: 0
        });

        batches.push(transactionBatch);
      }

      this.log.info('Batches lenght', { length: batches.length }, this.constructor.name);

      /* Index block with batch immediately */
      // IMPORTANT: this is case when we have just 1 transactions batch
      // so in order not to waste time, we index the entire block and transactions at once in one command
      if (batches.length == 1) {
        // { <aggregateId>:<status> }
        const batchesMap: Map<string, string> = new Map();
        batches.forEach(batch => {
          batchesMap.set(batch.aggregateId, 'completed');
        });

        await blockModel.indexWithComplete({
          aggregateId: hash,
          block: blockWithoutTx,
          batches: batchesMap,
          requestId
        });

        await indexerModel.addBlockWithImmediatelyConfirm({ requestId, block: blockWithoutTx });

        await this.eventStore.save([...batches, indexerModel, blockModel]);

        await blockModel.commit();
        await indexerModel.commit();

        for (let batch of batches) {
          await batch.commit();
        }

        this.log.info(`Block successfull indexed`, {
          block: { height, hash },
          alreadyIndexedLength: indexerModel.chain.lastBlockHeight
        }, this.constructor.name);
        return; 
      }

      /* Continue starting to index block */
      // { <aggregateId>:<status> }
      const batchesMap: Map<string, string> = new Map();
      batches.forEach(batch => {
        batchesMap.set(batch.aggregateId, 'created');
      });

      await indexerModel.addBlock({ block: { height, hash, previousblockhash }, requestId });
      
      this.log.debug('Indexer added new block', { aggregateId: indexerModel.aggregateId, block: { height, hash, previousblockhash } }, this.constructor.name);

      await blockModel.index({
        aggregateId: hash,
        block: blockWithoutTx,
        batches: batchesMap,
        requestId
      });


      await this.eventStore.save([...batches, indexerModel, blockModel]);

      await indexerModel.commit();
      await blockModel.commit();

      this.log.debug('Block index started', { block: blockWithoutTx }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
