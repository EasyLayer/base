import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { exponentialIntervalAsync } from '@easylayer/exponential-interval-async';
import { TransactionsBatchQueue } from '../transactions-batch-queue';
import { BatchesQueueCollectorService } from '../batches-collector';
import { TransactionsBatch } from '../interfaces';
import {
  BlocksWebhookStreamStrategy,
  PullBlocksByNetworkProviderStrategy,
  BlocksLoadingStrategy,
  StrategyNames,
} from './load-strategies';
import { TransactionsQueueConfig } from '../config/transactions-queue.config';

@Injectable()
export class BatchesQueueLoaderService implements OnModuleDestroy {
  private _queue!: TransactionsBatchQueue<TransactionsBatch>;
  private _isLoading: boolean = false;
  private _loadingStrategy: BlocksLoadingStrategy | null = null;
  private _currentNetworkHeight: number = -1;
  private _isTransportMode: boolean;

  constructor(
    private readonly log: AppLogger,
    private readonly txQueueConfig: TransactionsQueueConfig,
    private readonly batchesQueueCollectorService: BatchesQueueCollectorService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService,
    private readonly options: any
  ) {
    this._isTransportMode = options.isTransportMode;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  async onModuleDestroy() {
    this.destroyStrategy();
  }

  public async startTransactionsLoading(
    indexedHeight: number | string,
    queue: TransactionsBatchQueue<TransactionsBatch>
  ): Promise<void> {
    this.log.debug('startTransactionsLoading()', { indexedHeight }, this.constructor.name);

    // NOTE: We use this to make sure that
    // method startTransactionsLoading() is executed only once in its entire life.
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
          // IMPORTANT: At the moment, it’s easier for us to destroy the strategy
          // and create a new one in the next interval rather than just stopping it.
          // This is because in the future we want strategies to switch automatically
          await this.destroyStrategy();
        }
      },
      {
        interval: 1000,
        maxInterval: 10 * 60 * 1000, // TODO: add to env. Bitcoin block time
        multiplier: 2,
      }
    );
  }

  public async handleBlockFromStream(block: any): Promise<void> {
    if (!this.batchesQueueCollectorService.addBlock(block)) {
      await this._loadingStrategy?.destroy();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async handleTransactionFromStream(tx: any): Promise<void> {
    throw new Error('This method has not yet been implemented');
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
    const name = this.txQueueConfig.BITCOIN_TRANSACTIONS_QUEUE_LOADER_STRATEGY_NAME;

    switch (name) {
      case StrategyNames.BLOCKS_WEBHOOK_STREAM:
        return new BlocksWebhookStreamStrategy(this.webhookStreamService, this._queue);
      case StrategyNames.PULL_BLOCKS_BY_NETWORK_PROVIDER:
        return new PullBlocksByNetworkProviderStrategy(
          this.batchesQueueCollectorService,
          this.networkProviderService,
          this._queue,
          {
            minThreads: this.txQueueConfig.BITCOIN_TRANSACTIONS_QUEUE_WORKERS_NUM,
            maxThreads: this.txQueueConfig.BITCOIN_TRANSACTIONS_QUEUE_WORKERS_NUM,
          }
        );
      // case StrategyNames.PULL_BLOCKS_BY_NETWORK_TRANSPORT:
      //   return new PullNetworkProviderStrategy({}, this._queue, options);
      default:
        throw new Error(`Unknown strategy: ${name}`);
    }
  }
}
