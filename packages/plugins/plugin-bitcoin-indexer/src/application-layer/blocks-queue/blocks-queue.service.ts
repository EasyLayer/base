import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import Piscina from 'piscina';
import { AppLogger } from '@easylayer/logger';
import { ConnectionManager } from '@easylayer/bitcoin-network-provider';
import { BlocksQueue } from './blocks-queue';
import { Block } from './interfaces';
import { BlocksCommandFactoryService } from '../services/blocks-command-factory.service';

@Injectable()
export class BlocksQueueService {
  private blockQueue = new BlocksQueue<Block>();
  private workerPool: Piscina = new Piscina({
    filename: join(__dirname, 'worker.js'),
    minThreads: 1,
    maxThreads: 1 // TODO: max threads = cpu * 2 - 2
  });
  private maxQueueSize: number = 10; // TODO: move into env
  private commonHeight: bigint = 0n; // TODO: это можно сделать частью самой очереди
  private isLoadingStarted = false;

  constructor(
    private readonly log: AppLogger,
    private readonly blocksCommandFactory: BlocksCommandFactoryService,
    private readonly connectionManager: ConnectionManager,
    // private readonly 
  ) {
    this.startQueueIteratting();
  }

  public async getOneBlockByHeight(height: bigint | string): Promise<Block> {
    return this.blockQueue.fetchBlockByHeight(BigInt(height));
  }

  private async *blocksIterator(): AsyncGenerator<Block, void, unknown> {
    while (true) {
      if (this.blockQueue.length > 0) {
        const block = await this.blockQueue.peekFirstBlock();
        if (block) {
          yield block;
        } else {
        // Wait 1s until new blocks appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  private async startQueueIteratting(): Promise<void> {
    for await (const block of this.blocksIterator()) {
      try {
        // await this.blocksCommandFactory.indexBlock({ block, requestId: uuidv4() });
      } catch (error) {
        this.log.error('Failed to process block:', error, this.constructor.name);
      }
    }
  }

  public async startBlocksLoading(commonHeight: bigint | string): Promise<void> {
    this.log.debug('startBlocksLoading()', { commonHeight }, this.constructor.name);

    if (this.isLoadingStarted) {
      // Loading Blocks already started
      return;
    }

    this.isLoadingStarted = true;
    this.blockQueue.lastHeight = BigInt(commonHeight);

    while (true) {
      await this.loading();
    }
  }
  
  public async reorganizeBlocks(newStartHeight: bigint): Promise<void> {
    this.log.debug('reorganizeBlocks()', { newStartHeight }, this.constructor.name);
    this.blockQueue.clear();

    this.log.debug('Block Queue was clear', { newStartHeight }, this.constructor.name);

    // Set a new initial height for loading blocks
    this.commonHeight = newStartHeight;
  }

  public async confirmIndexBlock(): Promise<void> {
    return this.blockQueue.dequeue();
  }

  private async loading(): Promise<void> {
    // IMPORTANT: This is a temp array 
    // it needs to calculate blocks from parallel threds before enqueue
    let blocksBatch: Block[] = [];

    this.log.debug('Blocks Queue Length', { length: this.blockQueue.length }, this.constructor.name);

    while (this.blockQueue.length < this.maxQueueSize) {
      const promises = [];

      for (let i = 0; i < this.workerPool.options.maxThreads + 1; i++) {
        promises.push(this.loadBlockWithRetry(this.blockQueue.lastHeight + BigInt(i)));
      }

      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        if (result.status === "fulfilled") {
          blocksBatch.push(result.value);
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
        }
      }
    }
  }

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
    }

    return true;
  }

  private async loadBlock(height: bigint): Promise<Block> {
    this.log.debug('loadBlock()', { height }, this.constructor.name);

    const providersConnectionOptions = this.connectionManager.connectionOptionsForAllProviders();
    return this.workerPool.run({ height, providersConnectionOptions });
  }

  private async loadBlockWithRetry(height: bigint, maxRetries: number = 3): Promise<Block> {
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
