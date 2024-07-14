import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { TransactionsBatchQueue } from './transactions-batch-queue';
import { TransactionsBatch } from './interfaces';
import { BatchesQueueIteratorService } from './batches-iterator';
import { BatchesQueueLoaderService } from './batches-loader';
import { BatchesQueueCollectorService } from './batches-collector';
import { TransactionsQueueConfig } from './config/transactions-queue.config';

@Injectable()
export class TransactionsQueueService {
  private _batchQueue = new TransactionsBatchQueue<TransactionsBatch>();

  constructor(
    private readonly log: AppLogger,
    private readonly batchesQueueIterator: BatchesQueueIteratorService,
    private readonly batchesQueueLoader: BatchesQueueLoaderService,
    private readonly txQueueConfig: TransactionsQueueConfig,
    private readonly batchesCollectorService: BatchesQueueCollectorService,
    private readonly options: any
  ) {
    // IMPORTANT: We init the collector in the constructor to be sure
    // that it is immediately operational;
    // this is necessary because the collector is exported from the module
    // and can be used directly by other components.
    this.batchesCollectorService.init(this._batchQueue);

    this._batchQueue.maxQueueLength = this.txQueueConfig.BITCOIN_TRANSACTIONS_QUEUE_MAX_LENGTH;
    this._batchQueue.maxBlockHeight = BigInt(this.options.maxBlockHeight);
  }

  get queue(): TransactionsBatchQueue<TransactionsBatch> {
    return this._batchQueue;
  }

  get batchesCollector(): BatchesQueueCollectorService {
    return this.batchesCollectorService;
  }

  async start(indexedHeight: string | bigint | number) {
    try {
      this.log.debug('start()', { indexedHeight }, this.constructor.name);

      await Promise.allSettled([
        this.batchesQueueLoader.startTransactionsLoading(BigInt(indexedHeight), this._batchQueue),
        this.batchesQueueIterator.startQueueIterating(this._batchQueue),
      ]);
    } catch (error) {
      this.log.error('Erorr', error, this.constructor.name);
    }
  }

  public async reorganizeBatches(newStartHeight: bigint | string | number): Promise<void> {
    this.log.debug('reorganizeBatches()', { newStartHeight }, this.constructor.name);

    // NOTE: We clear the entire queue
    // because if a reorganization has occurred, this means that all the batches in the queue
    // have already gone along the wrong chain
    this._batchQueue.clear();

    // Set a new initial height for loading blocks
    this._batchQueue.lastHeight = BigInt(newStartHeight);

    this.batchesQueueIterator.resolveNextBatch();

    this.log.debug('Transactions Batches Queue was clear to height: ', { newStartHeight }, this.constructor.name);
  }

  public async confirmIndexBatch({
    blockHash,
    blockHeight,
    prevBlockHash,
    n,
  }: {
    blockHash: string;
    blockHeight: string;
    prevBlockHash: string;
    n: number;
  }): Promise<void> {
    this.log.debug(`confirmIndexBatch()`, { blockHash }, this.constructor.name);

    // IMPORTANT: This method must be idenpotent.
    // To do this, we added a check and remove only the required batch from the queue,
    // BUT if there is no such batch, then we will skip it, without an error!

    const batch = this._batchQueue.firstBatch;

    if (batch) {
      if (
        batch.blockHash === blockHash &&
        batch.blockHeight === BigInt(blockHeight) &&
        batch.blockPrevHash === prevBlockHash &&
        batch.n === n
      ) {
        this._batchQueue.dequeue();
      }
    }

    this.batchesQueueIterator.resolveNextBatch();
  }
}
