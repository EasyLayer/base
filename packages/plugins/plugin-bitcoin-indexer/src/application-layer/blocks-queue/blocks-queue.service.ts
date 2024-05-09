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
    maxThreads: 4 // TODO: max threads = cpu * 2 - 2
  });
  private maxQueueSize: number = 10; // TODO: move into env
  private commonHeight: bigint = 0n;
  private isLoadingStarted = false;

  constructor(
    private readonly log: AppLogger,
    private readonly blocksCommandFactory: BlocksCommandFactoryService,
    private readonly connectionManager: ConnectionManager,
    // private readonly 
  ) {
    this.startQueueIteratting();
  }

  public async startBlocksLoading(commonHeight: bigint | string): Promise<void> {
    this.log.debug('startBlocksLoading()', { commonHeight }, this.constructor.name);

    if (this.isLoadingStarted) {
      this.log.debug('Loading Blocks already started', {}, this.constructor.name);
      return;
    }

    this.isLoadingStarted = true;
    this.commonHeight = BigInt(commonHeight);
    const activeTasks = new Set();
    while (true) {
      while (this.blockQueue.length < this.maxQueueSize && activeTasks.size < this.workerPool.options.maxThreads) {
        const task = this.loadBlock(this.commonHeight++)
          .then(block => {
            this.log.debug('Block was load', { block }, this.constructor.name);

            this.blockQueue.enqueue(block);

            this.log.debug('Block Queue was enqueue', { block }, this.constructor.name);

            activeTasks.delete(task);
          })
          .catch(error => {
            console.error(error);
            activeTasks.delete(task);
          });

        activeTasks.add(task);
      }
      if (activeTasks.size > 0) {
        await Promise.allSettled(Array.from(activeTasks));
      }
    }
  }
  
  public async reorganizeBlocks(newStartHeight: bigint): Promise<void> {
    this.log.debug('reorganizeBlocks()', { newStartHeight }, this.constructor.name);
    this.blockQueue.clear();

    this.log.debug('Block Queue was clear', { newStartHeight }, this.constructor.name);

    // Set a new initial height for loading blocks
    this.commonHeight = newStartHeight;
  }

  private async loadBlock(height: bigint): Promise<Block> {
    this.log.debug('loadBlock()', { height }, this.constructor.name);

    const providersConnectionOptions = this.connectionManager.connectionOptionsForAllProviders();
    return this.workerPool.run({ height, providersConnectionOptions });
  }

  private async startQueueIteratting(): Promise<void> {
    this.log.debug('startQueueIteratting()', {}, this.constructor.name);

    while (true) {
      this.log.debug('Block Queue Lenght: ', { length: this.blockQueue.length }, this.constructor.name);
      // This will wait for a block to be available
      const block = await this.blockQueue.peekFirstBlock();
      if (block) {
        this.log.debug('Block Queue was dequeue', { block }, this.constructor.name);

        await this.processBlock(block);
      }
    }
  }

  private async processBlock(block: Block): Promise<void> {
    this.log.debug('processBlock()', { block }, this.constructor.name);

    try {
      await this.blocksCommandFactory.indexBlock({ block, requestId: uuidv4() });
    } catch (error) {
      this.log.error('Failed to process block:', error, this.constructor.name);
    }
  }

  async confirmProcessBlock(): Promise<void> {
    return this.blockQueue.dequeue();
  }

  async getOneBlockByHeight(height: bigint | string): Promise<Block> {
    return this.blockQueue.fetchBlockByHeight(BigInt(height));
  }
}
