import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { TransactionsBatchQueue } from '../transactions-batch-queue';
import { TransactionsBatch, BatchesCommandExecutor } from '../interfaces';

@Injectable()
export class BatchesQueueIteratorService {
  private _queue!: TransactionsBatchQueue<TransactionsBatch>;
  private _isIterating: boolean = false;
  private batchProcessedPromise!: Promise<void>;
  protected _resolveNextBatch!: () => void;

  constructor(
    private readonly log: AppLogger,
    @Inject('BatchesCommandExecutor')
    private readonly batchesCommandExecutor: BatchesCommandExecutor
  ) {}

  get resolveNextBatch() {
    return this._resolveNextBatch;
  }

  get isIterating() {
    return this._isIterating;
  }

  /**
   * Starts iterating over the transactions batch queue and processing batches.
   */
  public async startQueueIterating(queue: TransactionsBatchQueue<TransactionsBatch>): Promise<void> {
    this.log.debug('startQueueIterating()', {}, this.constructor.name);

    // NOTE: We use this to make sure that
    // method startQueueIterating() is executed only once in its entire life.
    if (this._isIterating) {
      // Iterating Bacthes already started
      return;
    }

    this._isIterating = true;

    // TODO: think where put this
    this._queue = queue;

    this.initBatchProcessedPromise();

    for await (const batch of this.batchesIterator()) {
      try {
        await this.batchesCommandExecutor.indexBatch({ batch, requestId: uuidv4() });
      } catch (error) {
        this.log.error('Failed to process batch:', { error }, this.constructor.name);

        // IMPORTANT: We call this to resolve queue promise
        // that we can try same batch one more time
        this._resolveNextBatch();
      }
    }
  }

  private async *batchesIterator(): AsyncGenerator<TransactionsBatch, void, unknown> {
    while (true) {
      if (this._queue.length > 0) {
        const batch = await this.peekFirstBatch();
        if (batch) {
          yield batch;
        }
      } else {
        // TODO: add description about why we use setTimeout() here
        // await new Promise(resolve => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  private async peekFirstBatch(): Promise<TransactionsBatch | undefined> {
    // NOTE: Before processing the next batch from the queue,
    // we wait for the resolving of the promise of the previous batch
    await this.batchProcessedPromise;

    // Init the promise for the next wait
    this.initBatchProcessedPromise();

    return this._queue.peekFirstBatch();
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
