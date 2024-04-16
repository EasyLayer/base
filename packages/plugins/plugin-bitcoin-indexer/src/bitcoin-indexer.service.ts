import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger, RuntimeTracker } from '@easylayer/logger';

@Injectable()
export class BitcoinIndexerService implements OnModuleInit {
  constructor(private readonly log: AppLogger) {}

  async onModuleInit() {
    await this.initialization();
  }

  @RuntimeTracker({
    errorThresholdMs: 3000,
    warningThresholdMs: 2000,
  })
  private async initialization(): Promise<void> {
    this.log.info('Initialization all systems');

    try {
      // Init all aggregates
      // NOTE: we restore all aggregates and publish last event for each model
      // NO, we restore aggregates in each component
      // TODO
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
