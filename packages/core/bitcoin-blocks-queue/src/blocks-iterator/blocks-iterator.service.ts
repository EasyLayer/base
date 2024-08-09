import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueue } from '../blocks-queue';
import { Block, BlocksCommandExecutor } from '../interfaces';

@Injectable()
export class BlocksQueueIteratorService implements OnModuleDestroy {
  private _queue!: BlocksQueue<Block>;
  private _isIterating: boolean = false;
  private blockProcessedPromise!: Promise<void>;
  protected _resolveNextBlock!: () => void;

  constructor(
    private readonly log: AppLogger,
    @Inject('BlocksCommandExecutor')
    private readonly blocksCommandExecutor: BlocksCommandExecutor
  ) {}

  get resolveNextBlock() {
    return this._resolveNextBlock;
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

    this.initBlockProcessedPromise();

    while (this.isIterating) {
      if (this._queue.length > 0) {
        const block = await this.peekFirstBlock();
        if (block) {
          await this.processBlock(block);
        }
      } else {
        // TODO: add description about why we use setTimeout() here
        // await new Promise(resolve => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 0));
        this.log.debug('Queue is empty', {}, this.constructor.name);
      }
    }
  }

  private async processBlock(block: Block) {
    try {
      await this.blocksCommandExecutor.indexBlock({ block, requestId: uuidv4() });
    } catch (error) {
      this.log.error('Failed to iterate the block', error, this.constructor.name);

      // IMPORTANT: We call this to resolve queue promise
      // that we can try same block one more time
      this._resolveNextBlock();
    }
  }

  private async peekFirstBlock(): Promise<Block | null> {
    // NOTE: Before processing the next block from the queue,
    // we wait for the resolving of the promise of the previous block
    this.log.info('1blockProcessedPromise', null, this.constructor.name);
    await this.blockProcessedPromise;
    this.log.info('2blockProcessedPromise', null, this.constructor.name);

    // Init the promise for the next wait
    this.initBlockProcessedPromise();

    return this._queue.peekFirstBlock();
  }

  private initBlockProcessedPromise(): void {
    this.blockProcessedPromise = new Promise<void>((resolve) => {
      this._resolveNextBlock = resolve;
    });
    if (this._queue.length === 0) {
      this._resolveNextBlock();
    }
  }
}
