import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore';
import { EventStoreRepository } from '@easylayer/eventstore';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { TransactionsBatch } from '../models/transactions-batch.model';
import { TransactionsBatchModelFactoryService, BalancesIndexerModelFactoryService } from '../services';
import { AppConfig } from '../../config';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly appConfig: AppConfig,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: block - is from BlocksQueue
      const { block, requestId } = payload;
      const { tx, ...blockWithoutTx } = block;
      const { height, previousblockhash } = blockWithoutTx;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

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
        this.log.debug(`Balances Indexer reorganisation started`, {}, this.constructor.name);
        return;
      }

      const batches = [];

      this.log.debug('Transactions lenght', { length: tx.length }, this.constructor.name);

      // Split transactions by batches
      const transactionSlices = this.splitTransactionsIntoSlices(
        tx,
        this.appConfig.BITCOIN_BALANCES_INDEXER_MAX_TRANSACTIONS_BATCH_SIZE
      );

      for (let n = 0; n < transactionSlices.length; n++) {
        const transactions = transactionSlices[n];

        // TODO: add type
        const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();

        // Check if this is the last batch
        const isFinalBatch = n === transactionSlices.length - 1;

        await transactionBatch.index({
          aggregateId: uuidv4(),
          requestId,
          transactions,
          blockHeight: height,
          n,
          isFinalBatch,
        });

        batches.push(transactionBatch);
      }

      this.log.debug('Batches lenght', { length: batches.length }, this.constructor.name);

      await indexerModel.addBlock({
        requestId,
        block: {
          ...blockWithoutTx,
          // NOTE: we store batches ids with block in Indexer Blockchain structure
          batches: batches.map((item) => item.aggregateId),
        },
      });

      await this.eventStore.save([...batches, indexerModel]);

      for (const batch of batches) {
        await batch.commit();
      }

      // NOTE: This event is not currently being processed
      await indexerModel.commit();

      this.log.info('Balances successfull indexed', { batches: batches.length }, this.constructor.name);
      this.log.debug('Balances successfull indexed', { batches: batches.length }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', { error }, this.constructor.name);
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
