import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import Piscina from 'piscina';
import { AppLogger } from '@easylayer/logger';
import { ConnectionManager } from '@easylayer/bitcoin-network-provider';
import { BlocksQueue } from './blocks-queue';
import { Block } from './interfaces';
import { BlocksCommandFactoryService } from '../services/blocks-command-factory.service';

/**
 * A service that manages a queue of blockchain blocks and processes them using a worker pool.
 */
@Injectable()
export class BlocksQueueService implements OnModuleInit  {
  private blockQueue = new BlocksQueue<Block>();
  private workerPool: Piscina = new Piscina({
    filename: join(__dirname, 'worker.js'),
    minThreads: 1,
    maxThreads: 4 // TODO: max threads = cpu * 2 - 2
  });
  private maxQueueSize: number = 10; // TODO: move into env
  private isLoadingStarted = false;

  constructor(
    private readonly log: AppLogger,
    private readonly blocksCommandFactory: BlocksCommandFactoryService,
    private readonly connectionManager: ConnectionManager,
  ) {}

  /**
   * Initializes the queue iteratting on module initialization.
   */
  async onModuleInit() {
    await this.startQueueIteratting();
  }

  /**
   * Retrieves a block by its height from the queue.
   * @param height The height of the block as bigint or string.
   * @returns A promise that resolves to the block if found.
   */
  public async getOneBlockByHeight(height: bigint | string): Promise<Block> {
    return this.blockQueue.fetchBlockByHeight(BigInt(height));
  }

  private async *blocksIterator(): AsyncGenerator<Block, void, unknown> {
    while (true) {
      if (this.blockQueue.length > 0) {
        const block = await this.blockQueue.peekFirstBlock();
        if (block) yield block;
      } else {
        // Wait 1s until new blocks appear
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Starts iterating over the block queue and processing blocks.
   */
  private async startQueueIteratting(): Promise<void> {
    this.log.debug('startQueueIteratting()', {}, this.constructor.name);

    for await (const block of this.blocksIterator()) {
      try {
        await this.blocksCommandFactory.indexBlock({ block, requestId: uuidv4() });
      } catch (error) {
        this.log.error('Failed to process block:', error, this.constructor.name);
      }
    }
  }

  /**
   * Starts loading blocks up to a common height.
   * @param commonHeight The height from which to start loading blocks.
   */
  public async startBlocksLoading(commonHeight: bigint | string): Promise<void> {
    this.log.debug('startBlocksLoading()', { commonHeight }, this.constructor.name);

    if (this.isLoadingStarted) {
      // Loading Blocks already started
      return;
    }

    this.isLoadingStarted = true;
    // INPORTANT: Here we indicate the height that was actually the last processed
    // (NOT the next one)
    this.blockQueue.lastHeight = BigInt(commonHeight);

    while (true) {
      await this.loading();
    }
  }
  
  /**
   * Handles blockchain reorganization by clearing the queue and setting a new starting height.
   * @param newStartHeight The new starting height for block loading.
   */
  public async reorganizeBlocks(newStartHeight: bigint): Promise<void> {
    this.log.debug('reorganizeBlocks()', { newStartHeight }, this.constructor.name);
    //  NOTE: We clear the entire queue
    // because if a reorganization has occurred, this means that all the blocks in the queue
    // have already gone along the wrong chain
    this.blockQueue.clear();

    this.log.debug('Block Queue was clear', { newStartHeight }, this.constructor.name);

    // Set a new initial height for loading blocks
    this.blockQueue.lastHeight = newStartHeight;
  }

  /**
   * Confirms that a block has been already indexed by dequeuing it.
   */
  public async confirmIndexBlock(): Promise<void> {
    return this.blockQueue.dequeue();
  }

  private async loading(): Promise<void> {
    // IMPORTANT: This is a temp array 
    // it needs to calculate blocks from parallel threds before enqueue
    let blocksBatch: Block[] = [];

    // this.log.debug('Blocks Queue Length', { length: this.blockQueue.length }, this.constructor.name);

    while (this.blockQueue.length < this.maxQueueSize) {
      const promises = [];

      for (let i = 0; i < this.workerPool.options.maxThreads; i++) {
        promises.push(this.loadBlockWithRetry(this.blockQueue.lastHeight + 1n + BigInt(i)));
      }

      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        if (result.status === "fulfilled") {
          blocksBatch.push(result.value as Block); //TODO: add map for create Block
        } else {
          this.log.debug('Error loading block:', result.reason, this.constructor.name);

          // NOTE: If we got here it means we've already used up all the attempts to reload the blocks,
          // so we just exit this while loop without enqueue blocks.
          // We'll try again.
        }
      });

      if (blocksBatch.length === this.workerPool.options.maxThreads) {
        if (this.enqueueBlocksBatch(blocksBatch)) {
          // Clear temp array after successful enqueue
          blocksBatch = [];
        } else {
          // TODO: think about this case
          blocksBatch = [];
        }
      }
    }
  }

  /**
   * Enqueues a batch of blocks into the queue after sorting them by height.
   * @param blocksBatch Array of blocks to be enqueued.
   * @returns Boolean indicating whether all blocks were enqueued successfully.
   */
  private enqueueBlocksBatch(blocksBatch: Block[]): boolean {
    this.log.debug('enqueueBlocksBatch()', { blocksBatchLength: blocksBatch.length }, this.constructor.name);

    // Сортируем блоки в батче сначала
    blocksBatch.sort((a, b) => {
      if (a.height < b.height) return -1;
      if (a.height > b.height) return 1;
      return 0;
    });

    for (let block of blocksBatch) {
      if (!this.blockQueue.enqueue(block)) {
        this.log.debug('Block was not enqueued, wrong order', { height: block.height }, this.constructor.name);
        return false;
      }

      this.log.debug('Block was successfully added to the queue', {
        height: this.blockQueue.lastHeight,
        length: this.blockQueue.length
      }, this.constructor.name);
    }

    return true;
  }

  /**
   * Loads a block from the blockchain by its height.
   * @param height The height of the block to load.
   * @returns A promise that resolves to the loaded block.
   */
  private async loadBlock(height: bigint): Promise<Block> {
    this.log.debug('loadBlock()', { height }, this.constructor.name);

    const providersConnectionOptions = this.connectionManager.connectionOptionsForAllProviders();
    return this.workerPool.run({ height, providersConnectionOptions });
  }

  /**
   * Attempts to load a block from the blockchain by its height with retries in case of failures.
   * @param height The height of the block.
   * @param maxRetries Maximum number of retries.
   * @returns A promise that resolves to the loaded block after successful loading or exhausts all retries.
   */
  private async loadBlockWithRetry(height: bigint, maxRetries: number = 3): Promise<Block> {
    this.log.debug('loadBlockWithRetry()', { height, maxRetries }, this.constructor.name);

    let counter = 0;

    while (counter < maxRetries) {
      try {
          return await this.loadBlock(height);
      } catch (error) {
        counter++;
        this.log.debug(`Error loading block at height ${height}, counter ${counter}: ${error}`, this.constructor.name);
        if (counter >= maxRetries) {
          throw new Error(`Failed to load block at height ${height} after ${maxRetries} attempts: ${error}`);
        }
      }
    }

    // This line is unreachable,
    // but TypeScript requires the function to always return or throw an exception
    throw new Error(`Unexpected error in loadBlockWithRetry for height ${height}`);
  }
}
