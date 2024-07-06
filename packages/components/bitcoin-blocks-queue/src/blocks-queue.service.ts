import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BlocksQueue } from './blocks-queue';
import { Block } from './interfaces';
import { BlocksQueueIteratorService } from './blocks-iterator';
import { BlocksQueueLoaderService } from './blocks-loader';
import { BlocksQueueCollectorService } from './blocks-collector';
import { BlocksQueueConfig } from './config/blocks-queue.config';

@Injectable()
export class BlocksQueueService {
  private _blockQueue = new BlocksQueue<Block>();

  constructor(
    private readonly log: AppLogger,
    private readonly blocksQueueIterator: BlocksQueueIteratorService,
    private readonly blocksQueueLoader: BlocksQueueLoaderService,
    private readonly blocksQueueConfig: BlocksQueueConfig,
    private readonly blocksCollectorService: BlocksQueueCollectorService,
    private readonly options: any
  ) {
    // IMPORTANT: We init the collector in the constructor to be sure
    // that it is immediately operational;
    // this is necessary because the collector is exported from the module
    // and can be used directly by other components.
    this.blocksCollectorService.init(this._blockQueue);

    this._blockQueue.maxQueueLength = this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_MAX_LENGTH;
    this._blockQueue.maxBlockHeight = BigInt(this.options.maxBlockHeight);
  }

  get queue(): BlocksQueue<Block> {
    return this._blockQueue;
  }

  get blocksCollector(): BlocksQueueCollectorService {
    return this.blocksCollectorService;
  }

  async start(indexedHeight: string | bigint | number) {
    try {
      this.log.debug('start()', { indexedHeight }, this.constructor.name);

      await Promise.allSettled([
        this.blocksQueueLoader.startBlocksLoading(BigInt(indexedHeight), this._blockQueue),
        this.blocksQueueIterator.startQueueIterating(this._blockQueue),
      ]);
    } catch (error) {
      this.log.error('Erorr', error, this.constructor.name);
    }
  }

  public async reorganizeBlocks(newStartHeight: bigint | string | number): Promise<void> {
    this.log.debug('reorganizeBlocks()', { newStartHeight }, this.constructor.name);

    //  NOTE: We clear the entire queue
    // because if a reorganization has occurred, this means that all the blocks in the queue
    // have already gone along the wrong chain
    this._blockQueue.clear();

    // Set a new initial height for loading blocks
    this._blockQueue.lastHeight = BigInt(newStartHeight);

    this.blocksQueueIterator.resolveNextBlock();

    this.log.debug('Block Queue was clear to height: ', { newStartHeight }, this.constructor.name);
  }

  public async confirmIndexBlock(blockHash: string): Promise<void> {
    this.log.debug(`confirmIndexBlock()`, { blockHash }, this.constructor.name);

    // IMPORTANT: This method must be idenpotent.
    // To do this, we added a check and remove only the required block from the queue,
    // BUT if there is no such block, then we will skip it, without an error!

    const block = this._blockQueue.firstBlock;

    if (block && block.hash === blockHash) {
      this._blockQueue.dequeue();
    }

    this.blocksQueueIterator.resolveNextBlock();
  }

  public async getOneBlockByHeight(height: bigint | string | number): Promise<Block> {
    const block = this._blockQueue.fetchBlockFromOutStack(BigInt(height));
    if (!block) {
      throw new Error('No block found with height ${height.toString()}');
    }

    return block;
  }
}
