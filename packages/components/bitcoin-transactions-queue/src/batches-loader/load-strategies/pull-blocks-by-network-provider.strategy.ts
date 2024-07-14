import { join } from 'node:path';
import Piscina from 'piscina';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { BlocksLoadingStrategy, StrategyNames } from './load-strategy.interface';
import { BatchesQueueCollectorService } from '../../batches-collector';
import { TransactionsBatch, Block } from '../../interfaces';
import { TransactionsBatchQueue } from '../../transactions-batch-queue';

export class PullBlocksByNetworkProviderStrategy implements BlocksLoadingStrategy {
  readonly name: StrategyNames = StrategyNames.PULL_BLOCKS_BY_NETWORK_PROVIDER;
  private _workerPool!: Piscina;
  private _isLoading: boolean = false;

  constructor(
    private readonly batchesQueueCollector: BatchesQueueCollectorService,
    private readonly networkProvider: BitcoinNetworkProviderService,
    private readonly queue: TransactionsBatchQueue<TransactionsBatch>,
    config: {
      minThreads: number;
      maxThreads: number;
    }
  ) {
    this._workerPool = new Piscina({
      filename: join(__dirname, '../worker.js'),
      minThreads: config.minThreads,
      maxThreads: config.maxThreads,
    });
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async load(currentNetworkHeight: bigint): Promise<void> {
    if (this._isLoading) {
      return;
    }

    this._isLoading = true;

    while (this.queue.length < this.queue.maxQueueLength || this.queue.lastHeight < currentNetworkHeight) {
      try {
        // IMPORTANT: This is a temp array
        // it needs to calculate blocks from parallel threds before enqueue
        let blocks: any[] = [];
        const promises = [];

        for (let i = 0; i < this._workerPool.options.maxThreads; i++) {
          const nextHeight: bigint = this.queue.lastHeight + 1n + BigInt(i);
          if (nextHeight < currentNetworkHeight + 1n) {
            promises.push(this.loadBlockWithRetry(this.queue.lastHeight + 1n + BigInt(i)));
          }
        }

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            blocks.push(result.value as Block); //TODO: add map for create Block
          } else {
            // NOTE: If we got here it means we've already used up all the attempts to reload the blocks,
            // so we just exit this while loop without enqueue blocks.
            // We'll try again.

            // Clear temp array after successful enqueue
            blocks = [];
          }
        });

        this.enqueueBlocks(blocks);

        // Clear temp array after successful enqueue
        blocks = [];
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
    if (this._workerPool) {
      await this._workerPool.destroy();
    }
  }

  private enqueueBlocks(blocks: Block[]): void {
    blocks.sort((a, b) => {
      if (a.height < b.height) return -1;
      if (a.height > b.height) return 1;
      return 0;
    });

    for (const block of blocks) {
      this.batchesQueueCollector.addBlock(block);
    }
  }

  /**
   * Loads a block from the blockchain by its height.
   * @param height The height of the block to load.
   * @returns A promise that resolves to the loaded block.
   */
  private async loadBlock(height: bigint): Promise<Block> {
    const providersConnectionOptions = this.networkProvider.connectionManager.connectionOptionsForAllProviders();
    return this._workerPool.run({ height, providersConnectionOptions });
  }

  /**
   * Attempts to load a block from the blockchain by its height with retries in case of failures.
   * @param height The height of the block.
   * @param maxRetries Maximum number of retries.
   * @returns A promise that resolves to the loaded block after successful loading or exhausts all retries.
   */
  private async loadBlockWithRetry(height: bigint, maxRetries: number = 3): Promise<Block> {
    let counter = 0;
    let delay = 100;

    while (counter < maxRetries) {
      try {
        return await this.loadBlock(height);
      } catch (error) {
        counter++;
        // this.log.debug(`Error loading block at height ${height}, counter ${counter}: ${error}`, this.constructor.name);
        if (counter >= maxRetries) {
          throw new Error(`Failed to load block at height ${height} after ${maxRetries} attempts: ${error}`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    // This line is unreachable,
    // but TypeScript requires the function to always return or throw an exception
    throw new Error(`Unexpected error in loadBlockWithRetry for height ${height}`);
  }
}
