import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { IndexerCommandFactoryService } from './application-layer/services';
import { BlocksReadService } from './domain-layer/services';
import { BusinessConfig } from './config';

@Injectable()
export class IndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly indexerCommandFactory: IndexerCommandFactoryService,
    private readonly blocksReadService: BlocksReadService
  ) {}

  async onModuleInit() {
    await this.initialization();
  }

  private async initialization(): Promise<void> {
    this.log.info('Initialization all systems');

    try {
      const lastBlock = await this.blocksReadService.getLastBlock();

      await this.indexerCommandFactory.init({
        requestId: uuidv4(),
        startHeight: this.businessConfig.BITCOIN_INDEXER_START_BLOCK_HEIGHT,
        restoreFromHeight: lastBlock?.height && lastBlock.height > 0 ? lastBlock.height - 1 : undefined,
      });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
