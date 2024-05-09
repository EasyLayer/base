import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger, RuntimeTracker } from '@easylayer/logger';
import { NetworkCommandFactoryService } from './application-layer/services/network-command-factory.service';

@Injectable()
export class BitcoinIndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
    private readonly networkCommandFactory: NetworkCommandFactoryService
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
      await this.networkCommandFactory.init({ requestId: uuidv4() });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
