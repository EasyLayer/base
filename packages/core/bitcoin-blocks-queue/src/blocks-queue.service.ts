import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueue } from './blocks-queue';
import { Block } from './interfaces';
import { BlocksQueueIteratorService } from './blocks-iterator';
import { BlocksQueueLoaderService } from './blocks-loader';
import { BlocksQueueCollectorService } from './blocks-collector';
@Injectable()
export class BlocksQueueService {
  private _blockQueue = new BlocksQueue<Block>();

  constructor(
    private readonly log: AppLogger,
    private readonly blocksQueueIterator: BlocksQueueIteratorService,
    private readonly blocksQueueLoader: BlocksQueueLoaderService,
    private readonly blocksCollectorService: BlocksQueueCollectorService,
    private readonly config: any
  ) {
    // IMPORTANT: We init the collector in the constructor to be sure
    // that it is immediately operational;
    // this is necessary because the collector is exported from the module
    // and can be used directly by other components.
    this.blocksCollectorService.init(this._blockQueue);

    this._blockQueue.maxQueueLength = this.config.maxQueueLength;
    this._blockQueue.maxBlockHeight = this.config.maxBlockHeight;
  }

  get queue(): BlocksQueue<Block> {
    return this._blockQueue;
  }

  get blocksCollector(): BlocksQueueCollectorService {
    return this.blocksCollectorService;
  }

  start(indexedHeight: string | number) {
    this.blocksQueueLoader.startBlocksLoading(Number(indexedHeight), this._blockQueue);
    this.blocksQueueIterator.startQueueIterating(this._blockQueue);
  }

  public async reorganizeBlocks(newStartHeight: string | number): Promise<void> {
    //  NOTE: We clear the entire queue
    // because if a reorganization has occurred, this means that all the blocks in the queue
    // have already gone along the wrong chain
    this._blockQueue.clear();

    // Set a new initial height for loading blocks
    this._blockQueue.lastHeight = Number(newStartHeight);

    this.blocksQueueIterator.resolveNextBlock();

    this.log.info('Queue was clear to height: ', { newStartHeight }, this.constructor.name);
  }

  // Rename method to dequeueBlock
  public async confirmIndexBlock(blockHash: string): Promise<Block> {
    // IMPORTANT: This method must be idenpotent.
    // To do this, we added a check and remove only the required block from the queue,
    // BUT if there is no such block, then we will skip it, without an error!

    const block = this._blockQueue.firstBlock;

    if (block && block.hash === blockHash) {
      const b = this._blockQueue.dequeue();

      if (!b) {
        throw new Error(`Block is not found: ${blockHash}`);
      }

      this.blocksQueueIterator.resolveNextBlock();
      return b;
    }

    throw new Error(`Block is not found: ${blockHash}`);
  }
}
