import { backOff } from 'exponential-backoff';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';
import {
  WebhookStreamStrategy,
  PullNetworkProviderStrategy,
  BlocksLoadingStrategy,
  StrategyNames,
} from './load-strategies';
import { BlocksQueueConfig } from '../config/blocks-queue.config';

@Injectable()
export class BlocksQueueLoaderService implements OnModuleDestroy {
  private _queue!: BlocksQueue<Block>;
  private _isLoading: boolean = false;
  private _loadingStrategy: BlocksLoadingStrategy | null = null;
  private _isStreamStrategyAllow: boolean = false;
  private _currentNetworkHeight: bigint = -1n;

  constructor(
    private readonly log: AppLogger,
    private readonly blocksQueueConfig: BlocksQueueConfig,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService,
    private readonly options: any
  ) {
    this._isStreamStrategyAllow = this.blocksQueueConfig.isAllowStreamLoad();
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async onModuleDestroy() {
    this.destroyStrategy();
  }

  public async startBlocksLoading(indexedHeight: bigint | number | string, queue: BlocksQueue<Block>): Promise<void> {
    this.log.debug('startBlocksLoading()', { indexedHeight }, this.constructor.name);

    // NOTE: We use this to make sure that
    // method startQueueIterating() is executed only once in its entire life.
    if (this._isLoading) {
      return;
    }

    this._isLoading = true;

    // TODO: think where put this
    this._queue = queue;

    // INPORTANT: Here we indicate the height that was actually the last processed
    // (NOT the next one)
    this._queue.lastHeight = BigInt(indexedHeight);

    await backOff(
      async () => {
        if (this._queue.lastHeight >= this._queue.maxBlockHeight) {
          this.log.info('Reached max block height', { height: this._queue.lastHeight }, this.constructor.name);
          return;
        }

        // Setup the strategy
        await this.setupStrategy();

        try {
          await this._loadingStrategy?.load(this._currentNetworkHeight);
        } catch (error) {
          // IMPORTANT: In case of an error, we are obliged to restart the strategy
          await this.destroyStrategy();
        }

        if (this._queue.lastHeight >= this._currentNetworkHeight) {
          // IMPORTANT: If the strategy has caught up with the network, we recreate it
          await this.destroyStrategy();
        }
      },
      {
        startingDelay: 1000,
        maxDelay: 10 * 60 * 1000, // TODO: add to env. Bitcoin block time
        numOfAttempts: Infinity,
        timeMultiple: 10,
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async addBlockToQueue(block: Block, strategyName?: StrategyNames): Promise<void> {
    if (!this._queue.enqueue(block)) {
      // NOTE: For now, we will get here only from the strategy of streaming via webhooks,
      // in the future it will be possible to expand.
      if (this._loadingStrategy?.name === StrategyNames.WEBHOOK_STREAM) {
        await this._loadingStrategy.destroy();
      }
    }
  }

  private async setupStrategy(): Promise<void> {
    // IMPORTANT: If a strategy is selected in which the .load() method completes immediately,
    // then this provider method will be called many times at first
    // (until the intervals become longer).
    // This is expected behavior.
    if (this.options && this.options.isTransportMode) {
      // this._currentNetworkHeight = await this.networkProviderService.getCurrentBlockHeight();
    } else {
      this._currentNetworkHeight = await this.networkProviderService.getCurrentBlockHeight();
    }

    if (this._loadingStrategy) {
      return;
    }

    if (
      !this._isStreamStrategyAllow ||
      this._queue.lastHeight < this._currentNetworkHeight - BigInt(this._queue.maxQueueLength)
    ) {
      this._loadingStrategy = this.createStrategy(StrategyNames.PULL_NETWORK_PROVIDER, {
        minThreads: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
        maxThreads: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
      });
    } else {
      this._loadingStrategy = this.createStrategy(StrategyNames.WEBHOOK_STREAM);
    }
  }

  public async destroyStrategy() {
    this.delayBeforeResetStategy();
    await this._loadingStrategy?.destroy();
    this._loadingStrategy = null;
  }

  private delayBeforeResetStategy(delay: number = 1000 * 60 * 5) {
    // IMPORTANT: If it was a stream, then you need to set a delay
    // and try using a different strategy for a while
    if (this._loadingStrategy?.name === StrategyNames.WEBHOOK_STREAM) {
      this._isStreamStrategyAllow = false;
      setTimeout(() => {
        this._isStreamStrategyAllow = true;
      }, delay);
    }
  }

  private createStrategy(name: StrategyNames, options?: any): BlocksLoadingStrategy {
    switch (name) {
      case StrategyNames.WEBHOOK_STREAM:
        return new WebhookStreamStrategy(this.webhookStreamService, this._queue);
      case StrategyNames.PULL_NETWORK_PROVIDER:
        return new PullNetworkProviderStrategy(this.networkProviderService, this._queue, options);
      default:
        throw new Error(`Unknown strategy: ${name}`);
    }
  }
}
