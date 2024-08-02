import { v4 as uuidv4 } from 'uuid';
import { Injectable, Inject } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueue } from '../blocks-queue';
import { Block, BlocksCommandExecutor } from '../interfaces';

@Injectable()
export class BlocksQueueIteratorService {
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

  /**
   * Starts iterating over the block queue and processing blocks.
   */
  public async startQueueIterating(queue: BlocksQueue<Block>): Promise<void> {
    this.log.debug('startQueueIterating()', {}, this.constructor.name);

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

    for await (const block of this.blocksIterator()) {
      try {
        await this.blocksCommandExecutor.indexBlock({ block, requestId: uuidv4() });
      } catch (error) {
        this.log.error('Failed to process block:', error, this.constructor.name);

        // IMPORTANT: We call this to resolve queue promise
        // that we can try same block one more time
        this._resolveNextBlock();
      }
    }
  }

  private async *blocksIterator(): AsyncGenerator<Block, void, unknown> {
    while (true) {
      if (this._queue.length > 0) {
        const block = await this.peekFirstBlock();
        if (block) {
          yield block;
        }
      } else {
        // TODO: add description about why we use setTimeout() here
        // await new Promise(resolve => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  private async peekFirstBlock(): Promise<Block | undefined> {
    // NOTE: Before processing the next block from the queue,
    // we wait for the resolving of the promise of the previous block
    await this.blockProcessedPromise;

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
