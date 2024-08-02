import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { BlocksLoadingStrategy, StrategyNames } from './load-strategy.interface';
import { Block } from '../../interfaces';
import { BlocksQueue } from '../../blocks-queue';

export class PullNetworkProviderByBatchesStrategy implements BlocksLoadingStrategy {
  readonly name: StrategyNames = StrategyNames.PULL_NETWORK_PROVIDER_BY_BATCHES;
  private _isLoading: boolean = false;
  private _batchLength!: number;

  constructor(
    private readonly networkProvider: BitcoinNetworkProviderService,
    private readonly queue: BlocksQueue<Block>,
    config: {
      batchLength: number;
    }
  ) {
    this._batchLength = config.batchLength;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async load(currentNetworkHeight: number): Promise<void> {
    if (this._isLoading) {
      return;
    }

    this._isLoading = true;

    while (this.queue.length < this.queue.maxQueueLength && this.queue.lastHeight < currentNetworkHeight) {
      // console.log('queue length: ', this.queue.length);
      try {
        // IMPORTANT: This is a temp array
        // it needs to calculate blocks from parallel threds before enqueue
        let blocksBatch: Block[] = [];

        const heights: number[] = [];

        for (let i = 0; i < this._batchLength; i++) {
          heights.push(this.queue.lastHeight + 1 + i);
        }

        // NOTE: second param = 2 means that we want to fetch all transactions with block
        blocksBatch = await this.networkProvider.getManyBlocksByHeights(heights, 2);

        if (blocksBatch.length > 0) {
          // console.log('blocks length', blocksBatch.length);
          this.enqueueBlocksBatch(blocksBatch);
        }

        // Clear temp array after successful enqueue
        blocksBatch = [];
      } catch (error) {
        await this.stop();
        // TODO: think about this case
        throw error;
      }
    }

    await this.stop();
  }

  private async stop(): Promise<void> {
    if (!this._isLoading) return;

    this._isLoading = false;
  }

  async destroy(): Promise<void> {}

  private enqueueBlocksBatch(blocksBatch: Block[]): void {
    blocksBatch.sort((a, b) => {
      if (a.height < b.height) return -1;
      if (a.height > b.height) return 1;
      return 0;
    });

    for (const block of blocksBatch) {
      if (!this.queue.enqueue(block)) {
        break;
      }
    }
  }
}
