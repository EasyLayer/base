import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { IndexerCommandFactoryService } from './application-layer/services/indexer-command-factory.service';

@Injectable()
export class BitcoinIndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
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
      await this.indexerCommandFactory.init({ requestId: uuidv4() });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
