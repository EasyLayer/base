import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { exponentialIntervalAsync } from '@easylayer/exponential-interval-async';
import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';
import {
  WebhookStreamStrategy,
  PullNetworkProviderByBatchesStrategy,
  PullNetworkProviderByWorkersStrategy,
  BlocksLoadingStrategy,
  StrategyNames,
} from './load-strategies';
import { BlocksQueueConfig } from '../config/blocks-queue.config';

@Injectable()
export class BlocksQueueLoaderService implements OnModuleDestroy {
  private _queue!: BlocksQueue<Block>;
  private _isLoading: boolean = false;
  private _loadingStrategy: BlocksLoadingStrategy | null = null;
  private _currentNetworkHeight: number = -1;
  private _isTransportMode: boolean;

  constructor(
    private readonly log: AppLogger,
    private readonly blocksQueueConfig: BlocksQueueConfig,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService,
    private readonly options: any
  ) {
    this._isTransportMode = this.options.isTransportMode;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async onModuleDestroy() {
    this.destroyStrategy();
  }

  public async startBlocksLoading(indexedHeight: number | string, queue: BlocksQueue<Block>): Promise<void> {
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
    this._queue.lastHeight = Number(indexedHeight);

    await exponentialIntervalAsync(
      async () => {
        this.log.info('Loading blocks...', null, this.constructor.name);
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
        interval: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_LOADER_INTERVAL_MS,
        maxInterval: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MS,
        multiplier: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MULTIPLIER,
      }
    );
  }

  public async handleBlockFromStream(block: Block): Promise<void> {
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
    if (this._isTransportMode) {
      // this._currentNetworkHeight = await this.networkProviderService.getCurrentBlockHeight();
    } else {
      this._currentNetworkHeight = await this.networkProviderService.getCurrentBlockHeight();
    }

    if (this._loadingStrategy) {
      return;
    }

    this._loadingStrategy = this.createStrategy();
  }

  public async destroyStrategy() {
    await this._loadingStrategy?.destroy();
    this._loadingStrategy = null;
  }

  private createStrategy(): BlocksLoadingStrategy {
    const name = this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_LOADER_STRATEGY_NAME;

    switch (name) {
      case StrategyNames.WEBHOOK_STREAM:
        return new WebhookStreamStrategy(this.webhookStreamService, this._queue);
      case StrategyNames.PULL_NETWORL_PROVIDER_BY_WORKERS:
        return new PullNetworkProviderByWorkersStrategy(this.networkProviderService, this._queue, {
          minThreads: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
          maxThreads: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
        });
      case StrategyNames.PULL_NETWORK_PROVIDER_BY_BATCHES:
        return new PullNetworkProviderByBatchesStrategy(this.networkProviderService, this._queue, {
          batchLength: this.blocksQueueConfig.BITCOIN_BLOCKS_QUEUE_LOADER_NETWORK_PROVIDER_BATCHES_LENGTH,
        });
      // case StrategyNames.PULL_BLOCKS_BY_NETWORK_TRANSPORT:
      //   return new PullNetworkProviderStrategy({}, this._queue, options);
      default:
        throw new Error(`Unknown strategy: ${name}`);
    }
  }
}
