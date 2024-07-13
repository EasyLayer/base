import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Block } from '../models/block.model';
import { Indexer } from '../models/indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import {
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
  IndexerModelFactoryService,
} from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly blocksModelFactory: BlockModelFactoryService,
    private readonly indexerModelFactory: IndexerModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: block - is from BlocksQueue
      const { block, requestId } = payload;
      const { tx, ...blockWithoutTx } = block;
      const { height, hash, previousblockhash } = blockWithoutTx;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: Indexer = await this.indexerModelFactory.initModel();

      this.log.debug('Init Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Reorganisation */
      // IMPORTANT: We do this check here, and not inside the aggregate,
      // because we don’t want to throw an error and process it
      if (!indexerModel.chain.validateNextBlock(height, previousblockhash)) {
        await indexerModel.startReorganisation({
          height,
          requestId,
          service: this.networkProviderService,
          blocks: [],
        });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        this.log.debug(`Indexer reorganisation started`, {}, this.constructor.name);
        return;
      }

      /* Start indexing block */
      // IMPORTANT: We do not check whether a block with such a hash exists in the state,
      // but overwrite the state if so
      const blockModel: Block = this.blocksModelFactory.createNewModel();

      // TODO: move into env
      const MAX_TRANSACTIONS_BATCH_SIZE = 10 * 1000 * 1024; // 1000 KB

      const batches = [];

      this.log.info('Transactions lenght', { length: tx.length }, this.constructor.name);

      if (tx.length > 0) {
        // Split transactions by batches
        const transactionSlices = this.splitTransactionsIntoSlices(tx, MAX_TRANSACTIONS_BATCH_SIZE);

        if (transactionSlices.length === 1) {
          // NOTE: Case when we have single batch
          // we indexing it immediately
          const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();
          await transactionBatch.createWithIndexing({
            aggregateId: uuidv4(),
            requestId,
            transactions: transactionSlices[0],
            blockHeight: height,
            blockHash: hash,
            isFinalBatch: true,
            index: 0,
          });

          batches.push(transactionBatch);
        } else {
          for (let index = 0; index < transactionSlices.length; index++) {
            const slice = transactionSlices[index];

            // TODO: add type
            // IMPORTANT: Here we just get the txid and put them in the array of non-indexed transactions.
            // that because we don't want to send all transactions by Transport, so we will get it from cache
            const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();

            // Check if this is the last batch
            const isFinalBatch = index === transactionSlices.length - 1;

            await transactionBatch.create({
              aggregateId: uuidv4(),
              requestId,
              transactions: slice,
              blockHeight: height,
              blockHash: hash,
              index,
              isFinalBatch,
            });

            batches.push(transactionBatch);
          }
        }
      }

      this.log.info('Batches lenght', { length: batches.length }, this.constructor.name);

      /* Index block with batch immediately */
      // IMPORTANT: this is case when we have just 0 or 1 transactions batch
      // so in order not to waste time, we index the entire block and transactions at once in one command
      if (batches.length < 2) {
        // { <aggregateId>:<status> }
        const batchesMap: Map<string, string> = new Map();
        batches.forEach((batch) => {
          batchesMap.set(batch.aggregateId, 'completed');
        });

        await blockModel.indexWithComplete({
          aggregateId: hash,
          block: blockWithoutTx,
          batches: batchesMap,
          txCount: tx.lenght,
          requestId,
        });

        await indexerModel.addBlockWithImmediatelyConfirm({
          requestId,
          block: {
            ...blockWithoutTx,
            // NOTE: we store batches ids with block in Indexer Blockchain structure
            batches: batches.map((item) => item.aggregateId),
          },
        });

        await this.eventStore.save([...batches, indexerModel, blockModel]);

        await blockModel.commit();
        await indexerModel.commit();

        for (const batch of batches) {
          await batch.commit();
        }

        this.log.info(
          `Block successfull indexed`,
          {
            block: { height, hash },
            alreadyIndexedLength: indexerModel.chain.lastBlockHeight,
          },
          this.constructor.name
        );
        return;
      }

      /* Continue starting to index block */
      // { <aggregateId>:<status> }
      const batchesMap: Map<string, string> = new Map();
      batches.forEach((batch) => {
        batchesMap.set(batch.aggregateId, 'created');
      });

      await indexerModel.addBlock({
        requestId,
        block: {
          height,
          hash,
          previousblockhash,
          // NOTE: we store batches ids with block in Indexer Blockchain structure
          batches: batches.map((item) => item.aggregateId),
        },
      });

      this.log.debug(
        'Indexer added new block',
        { aggregateId: indexerModel.aggregateId, block: { height, hash, previousblockhash } },
        this.constructor.name
      );

      await blockModel.index({
        aggregateId: hash,
        block: blockWithoutTx,
        batches: batchesMap,
        txCount: tx.lenght,
        requestId,
      });

      await this.eventStore.save([...batches, indexerModel, blockModel]);

      await indexerModel.commit();
      await blockModel.commit();

      for (const batch of batches) {
        await batch.commit();
      }

      this.log.debug('Block index started', { block: blockWithoutTx }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }

  private getSizeInBytes<T extends object>(object: T) {
    return Buffer.byteLength(JSON.stringify(object), 'utf8');
  }

  private splitTransactionsIntoSlices(transactions: any[], maxBatchSize: number) {
    let currentBatchSize = 0;
    let transactionSlice = [];
    const slices = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const transactionSize = this.getSizeInBytes(transaction);

      // Check if adding this transaction exceeds the slice size limit
      if (currentBatchSize + transactionSize > maxBatchSize) {
        slices.push(transactionSlice);

        // Reset for next batch
        currentBatchSize = 0;
        transactionSlice = [];
      }

      // Add the current transaction to the current batch
      transactionSlice.push(transaction);
      currentBatchSize += transactionSize;
    }

    // Handle the final batch if it exists
    if (transactionSlice.length > 0) {
      slices.push(transactionSlice);
    }

    return slices;
  }
}
