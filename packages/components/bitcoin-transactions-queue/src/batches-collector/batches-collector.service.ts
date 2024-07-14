import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { TransactionsBatch, Block } from '../interfaces';
import { TransactionsBatchQueue } from '../transactions-batch-queue';
import { TransactionsQueueConfig } from '../config';

@Injectable()
export class BatchesQueueCollectorService {
  private _queue!: TransactionsBatchQueue<TransactionsBatch>;

  constructor(
    private readonly log: AppLogger,
    private readonly config: TransactionsQueueConfig
  ) {}

  public init(queue: TransactionsBatchQueue<TransactionsBatch>) {
    this._queue = queue;
  }

  public addBatch(batch: TransactionsBatch): boolean {
    if (!this.validateBatch(batch)) {
      return false;
    }

    return this.enqueueBatch(batch);
  }

  public addBlock(block: Block): boolean {
    if (!this.validateBlock(block)) {
      return false;
    }

    const batches = this.splitBlockIntoBatches(block);
    return batches.every((batch) => this.enqueueBatch(batch));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public addTransactions(tx: any | any[]): void {
    throw new Error('This method has not yet been implemented');
  }

  private enqueueBatch(batch: TransactionsBatch): boolean {
    const success = this._queue.enqueue(_.cloneDeep(batch));
    if (!success) {
      this.log.debug('Batch was not enqueued, by collector', { height: batch.blockHeight }, this.constructor.name);
      return false;
    }

    return true;
  }

  private splitBlockIntoBatches(block: any): TransactionsBatch[] {
    const { tx, hash, height, prevblockhash } = block;
    const batches: TransactionsBatch[] = [];

    if (tx.length > this.config.BITCOIN_TRANSACTIONS_QUEUE_MAX_TRANSACTIONS_PER_BATCH) {
      let index = 0;
      while (tx.length > 0) {
        const transactionSlice = block.tx.splice(0, this.config.BITCOIN_TRANSACTIONS_QUEUE_MAX_TRANSACTIONS_PER_BATCH);
        const isFinalBatch = tx.length === 0;
        batches.push({
          blockHash: hash,
          blockHeight: height,
          prevBlockHash: prevblockhash,
          n: index,
          isFinalBatch,
          tx: transactionSlice,
        });
        index++;
      }
    } else {
      batches.push({
        blockHash: hash,
        blockHeight: height,
        prevBlockHash: prevblockhash,
        n: 0,
        isFinalBatch: true,
        tx,
      });
    }

    return batches;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private validateBatch(batch: TransactionsBatch): boolean {
    // Add custom batch validation logic here
    return true;
  }

  private validateBlock(block: any): boolean {
    // Add custom batch validation logic here
    if (BigInt(block?.height) !== this._queue.lastHeight + 1n) {
      return false;
    }

    return true;
  }

  // private reset(): void {}
}
