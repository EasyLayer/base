import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/core/bitcoin-network-provider';
import { exponentialIntervalAsync } from '@easylayer/components/exponential-interval-async';
import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';
import {
  WebhookStreamStrategy,
  PullNetworkProviderByBatchesStrategy,
  PullNetworkProviderByWorkersStrategy,
  BlocksLoadingStrategy,
  StrategyNames,
} from './load-strategies';

@Injectable()
export class BlocksQueueLoaderService implements OnModuleDestroy {
  private _queue!: BlocksQueue<Block>;
  private _isLoading: boolean = false;
  private _loadingStrategy: BlocksLoadingStrategy | null = null;
  private _currentNetworkHeight: number = -1;
  private _isTransportMode: boolean;

  constructor(
    private readonly log: AppLogger,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService,
    private readonly config: any
  ) {
    this._isTransportMode = this.config.isTransportMode;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async onModuleDestroy() {
    this.destroyStrategy();
    this._isLoading = false;
  }

  public async startBlocksLoading(indexedHeight: number | string, queue: BlocksQueue<Block>): Promise<void> {
    try {
      this.log.info('Setup blocks loading from height', { indexedHeight }, this.constructor.name);

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
        async (resetInterval) => {
          if (this._queue.lastHeight >= this._queue.maxBlockHeight) {
            this.log.info(
              'Reached max block height',
              { lastQueueHeight: this._queue.lastHeight },
              this.constructor.name
            );
            return;
          }

          // Setup the strategy
          await this.setupStrategy();

          try {
            await this._loadingStrategy?.load(this._currentNetworkHeight);
          } catch (error) {
            this.log.error('Load blocks strategy error', error, this.constructor.name);

            resetInterval();

            // IMPORTANT: In case of an error, we are obliged to restart the strategy
            await this.destroyStrategy();
          }

          this.log.info(
            'Load blocks waiting...',
            { queueHeight: this._queue.lastHeight, queueLegth: this._queue.length },
            this.constructor.name
          );
        },
        {
          interval: this.config.queueLoaderIntervalMs,
          maxInterval: this.config.queueLoaderMaxIntervalMs,
          multiplier: this.config.queueLoaderMaxIntervalMultiplier,
        }
      );
    } catch (error) {
      this.log.error('Erorr', error, this.constructor.name);
    }
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
    this.log.info('Setup blocks loading strategy...', {}, this.constructor.name);
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
    const name = this.config.queueLoaderStrategyName;

    switch (name) {
      case StrategyNames.WEBHOOK_STREAM:
        return new WebhookStreamStrategy(this.webhookStreamService, this._queue);
      case StrategyNames.PULL_NETWORL_PROVIDER_BY_WORKERS:
        return new PullNetworkProviderByWorkersStrategy(this.networkProviderService, this._queue, {
          minThreads: this.config.queueWorkersNum,
          maxThreads: this.config.queueWorkersNum,
        });
      case StrategyNames.PULL_NETWORK_PROVIDER_BY_BATCHES:
        return new PullNetworkProviderByBatchesStrategy(this.networkProviderService, this._queue, {
          batchLength: this.config.queueLoaderNetworkProviderBatchesLength,
        });
      // case StrategyNames.PULL_BLOCKS_BY_NETWORK_TRANSPORT:
      //   return new PullNetworkProviderStrategy({}, this._queue, options);
      default:
        throw new Error(`Unknown strategy: ${name}`);
    }
  }
}
