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

    this.blocksQueueIterator.resolveNextBatch();

    this.log.info('Queue was clear to height: ', { newStartHeight }, this.constructor.name);
  }

  public async confirmIndexBatch(blockHashes: string[]): Promise<Block[]> {
    const confirmedBlocks: Block[] = [];

    for (const hash of blockHashes) {
      const block = this._blockQueue.firstBlock;

      if (block && block.hash === hash) {
        const dequeuedBlock = this._blockQueue.dequeue();

        if (!dequeuedBlock) {
          throw new Error(`Block not found in the queue after dequeue: ${hash}`);
        }

        confirmedBlocks.push(dequeuedBlock);

        // Allow the next batch to be processed
        this.blocksQueueIterator.resolveNextBatch();
      } else {
        // If the block is not found or the hash does not match, throw an error
        throw new Error(`Block not found or hash mismatch: ${hash}`);
      }
    }

    return confirmedBlocks;
  }

  public getBlocksByHashes(hashes: string): Block[] {
    const hashSet = new Set(hashes);

    return this._blockQueue.findBlocks(hashSet);
  }
}
