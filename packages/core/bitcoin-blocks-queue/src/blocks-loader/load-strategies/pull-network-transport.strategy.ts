import { BlocksLoadingStrategy, StrategyNames } from './load-strategy.interface';
import { Block } from '../../interfaces';
import { BlocksQueue } from '../../blocks-queue';

export class PullNetworkTransportStrategy implements BlocksLoadingStrategy {
  readonly name: StrategyNames = StrategyNames.PULL_NETWORK_TRANSPORT;
  private _isLoading: boolean = false;

  constructor(private readonly queue: BlocksQueue<Block>) {}

  get isLoading(): boolean {
    return this._isLoading;
  }

  async load(currentNetworkHeight: number): Promise<void> {
    if (this._isLoading) {
      return;
    }

    this._isLoading = true;

    while (this.queue.length < this.queue.maxQueueLength || this.queue.lastHeight < currentNetworkHeight) {
      try {
      } catch (error) {
        await this.stop();
        // TODO: think about this case
      }
    }

    await this.stop();
  }

  private async stop(): Promise<void> {
    if (!this._isLoading) return;

    this._isLoading = false;
  }

  async destroy(): Promise<void> {
    // TODO
  }

  private enqueueBlocks(blocks: Block[]): void {
    blocks.sort((a, b) => {
      if (a.height < b.height) return -1;
      if (a.height > b.height) return 1;
      return 0;
    });

    for (const block of blocks) {
      if (!this.queue.enqueue(block)) {
        return;
      }
    }
  }
}
