import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { IndexerCommandFactoryService } from './application-layer/services';
import { BusinessConfig } from './config';

@Injectable()
export class BitcoinBalancesIndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly indexerCommandFactory: IndexerCommandFactoryService
  ) {}

  async onModuleInit() {
    await this.initialization();
  }

  // @RuntimeTracker({
  //   errorThresholdMs: 3000,
  //   warningThresholdMs: 2000,
  // })
  private async initialization(): Promise<void> {
    this.log.info('Initialization all systems');

    try {
      await this.indexerCommandFactory.init({
        requestId: uuidv4(),
        startHeight: this.businessConfig.BITCOIN_BALANCES_INDEXER_START_BLOCK_HEIGHT,
      });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
