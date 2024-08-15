import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueue } from '../blocks-queue';
import { Block, BlocksCommandExecutor } from '../interfaces';

@Injectable()
export class BlocksQueueIteratorService implements OnModuleDestroy {
  private _queue!: BlocksQueue<Block>;
  private _isIterating: boolean = false;
  private batchProcessedPromise!: Promise<void>;
  protected _resolveNextBatch!: () => void;
  private _blocksBatchSize: number = 1024;

  constructor(
    private readonly log: AppLogger,
    @Inject('BlocksCommandExecutor')
    private readonly blocksCommandExecutor: BlocksCommandExecutor,
    private readonly config: any
  ) {
    this._blocksBatchSize = this.config.queueIteratorBlocksBatchSize;
  }

  get resolveNextBatch() {
    return this._resolveNextBatch;
  }

  get isIterating() {
    return this._isIterating;
  }

  onModuleDestroy() {
    this._isIterating = false;
  }

  /**
   * Starts iterating over the block queue and processing blocks.
   */
  public async startQueueIterating(queue: BlocksQueue<Block>): Promise<void> {
    try {
      this.log.info('Setup blocks iterating', {}, this.constructor.name);

      // NOTE: We use this to make sure that
      // method startQueueIterating() is executed only once in its entire life.
      if (this._isIterating) {
        // Iterating Blocks already started
        return;
      }

      this._isIterating = true;

      // TODO: think where put this
      this._queue = queue;

      this.initBatchProcessedPromise();

      while (this.isIterating) {
        if (this._queue.length > 0) {
          const batch = await this.peekNextBatch();
          if (batch.length > 0) {
            await this.processBatch(batch);
          }
        } else {
          // TODO: add description about why we use setTimeout() here
          // await new Promise(resolve => setImmediate(resolve));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    } catch (error) {
      this.log.error('Erorr', error, this.constructor.name);
    }
  }

  private async processBatch(batch: Block[]) {
    try {
      await this.blocksCommandExecutor.indexBlock({ batch, requestId: uuidv4() });
    } catch (error) {
      this.log.error('Failed to process the batch', error, this.constructor.name);

      // IMPORTANT: We call this to resolve queue promise
      // that we can try same block one more time
      this._resolveNextBatch();
    }
  }

  private async peekNextBatch(): Promise<Block[]> {
    // NOTE: Before processing the next batch from the queue,
    // we wait for the resolving of the promise of the previous batch
    await this.batchProcessedPromise;

    // Init the promise for the next wait
    this.initBatchProcessedPromise();

    const batch: Block[] = [];
    let currentBatchSize = 0;

    const blocksIterator = this._queue.peekPrevBlock();

    while (true) {
      const { value: nextBlock, done } = blocksIterator.next();

      if (done) {
        this.log.debug('Queue is empty', {}, this.constructor.name);
        break; // Stop iteration if there are no more blocks
      }

      const blockSize = this.calculateBlockSize(nextBlock);

      // Check if adding this block would exceed the maximum batch size
      if (currentBatchSize + blockSize > this._blocksBatchSize) {
        if (batch.length === 0) {
          throw new Error('Block size exceeds the minimum for adding to a batch');
        }

        break; // Stop adding blocks if the next one would exceed the limit
      }

      // Add block to the batch
      batch.push(nextBlock);

      // Update current batch size
      currentBatchSize += blockSize;
    }

    return batch;
  }

  private calculateBlockSize(block: Block): number {
    let totalSize = 0;

    const { tx } = block;

    if (!tx || tx.length === 0) {
      return 0;
    }

    // Sum up the sizes of all transactions in a block based on their hex representation
    for (const t of tx) {
      // Divide by 2 since each byte is represented by two characters in hex
      totalSize += t.hex.length / 2;
    }

    return totalSize;
  }

  private initBatchProcessedPromise(): void {
    this.batchProcessedPromise = new Promise<void>((resolve) => {
      this._resolveNextBatch = resolve;
    });
    if (this._queue.length === 0) {
      this._resolveNextBatch();
    }
  }
}
