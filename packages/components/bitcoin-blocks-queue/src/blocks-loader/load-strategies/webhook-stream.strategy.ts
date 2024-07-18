import { BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BlocksLoadingStrategy, StrategyNames } from './load-strategy.interface';
import { Block } from '../../interfaces';
import { BlocksQueue } from '../../blocks-queue';

export class WebhookStreamStrategy implements BlocksLoadingStrategy {
  readonly name: StrategyNames = StrategyNames.WEBHOOK_STREAM;
  private _isLoading: boolean = false;
  private _streamId!: string;
  private _providerName!: string; // The name of provider with which stream was created

  constructor(
    private readonly webhookStreamService: BitcoinWebhookStreamService,
    private readonly queue: BlocksQueue<Block>
  ) {}

  get isLoading(): boolean {
    return this._isLoading;
  }

  async onModuleDestroy() {
    await this.destroy();
  }

  async load(currentNetworkHeight: number): Promise<void> {
    if (this._isLoading) {
      return;
    }

    try {
      const stream = await this.webhookStreamService.createStream({
        startHeight: this.queue.lastHeight + 1,
        endHeight: currentNetworkHeight,
      });

      this._streamId = stream.id;
      this._providerName = stream.providerName;
      this._isLoading = true;
    } catch (error) {
      await this.stop();
    }
  }

  private async stop(): Promise<void> {
    await this.webhookStreamService.destroyStream(this._streamId, this._providerName);
    this._isLoading = false;
  }

  async destroy(): Promise<void> {
    if (this._streamId && this._providerName) {
      await this.webhookStreamService.destroyStream(this._streamId, this._providerName);
    }
  }
}
