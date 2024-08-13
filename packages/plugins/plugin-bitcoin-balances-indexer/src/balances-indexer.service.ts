import { v4 as uuidv4 } from 'uuid';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { BalancesIndexerCommandFactoryService } from './application-layer/services';
import { OutputsReadService } from './domain-layer/services';

@Injectable()
export class BalancesIndexerService implements OnModuleInit {
  constructor(
    private readonly log: AppLogger,
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
        ...(lastOutput?.block_height > -1 ? { lastReadStateHeight: lastOutput.block_height } : {}),
      });
    } catch (error) {
      this.log.error('initialization()', error, this.constructor.name);
      throw error;
    }
  }
}
