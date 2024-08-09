import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BalancesIndexerCommandFactoryService } from './application-layer/services';
import { OutputsReadService } from './domain-layer/services';
import { BusinessConfig } from './config';

@Injectable()
export class BalancesIndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly indexerCommandFactory: BalancesIndexerCommandFactoryService,
    private readonly outputsReadService: OutputsReadService
  ) {}

  async onModuleInit() {
    await this.initialization();
  }

  private async initialization(): Promise<void> {
    this.log.info('Initialization Bitcoin Balances Indexer systems');

    try {
      const lastOutput = await this.outputsReadService.getLastOutput();

      await this.indexerCommandFactory.init({
        requestId: uuidv4(),
        startHeight: this.businessConfig.BITCOIN_BALANCES_INDEXER_START_BLOCK_HEIGHT,
        restoreFromHeight:
          lastOutput?.block_height && lastOutput.block_height > 0 ? lastOutput.block_height - 1 : undefined,
      });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
