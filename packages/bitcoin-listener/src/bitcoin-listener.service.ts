import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { ListenerCommandFactoryService } from './application-layer/services';
import { BusinessConfig } from './config';

@Injectable()
export class ListenerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly listenerCommandFactory: ListenerCommandFactoryService
  ) {}

  async onModuleInit() {
    await this.initialization();
  }

  private async initialization(): Promise<void> {
    this.log.info('Initialization all systems');

    try {
      const lastReadStateHeight = 10000000; //await this.viewsReadRepository.getLastBlock();

      await this.listenerCommandFactory.init({
        requestId: uuidv4(),
        startHeight: this.businessConfig.BITCOIN_INDEXER_START_BLOCK_HEIGHT,
        ...(lastReadStateHeight > -1 ? { lastReadStateHeight } : {}),
      });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
