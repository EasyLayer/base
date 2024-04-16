import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BitcoinTransactionsCommandFactoryService } from './application-layer/services';

@Injectable()
export class BitcoinTransactionsService implements OnModuleInit {
  constructor(
    private readonly transactionsCommandFactory: BitcoinTransactionsCommandFactoryService,
    private readonly log: AppLogger
  ) {}

  public async onModuleInit() {
    await this.aggregatesInitialization();
  }

  private async aggregatesInitialization(): Promise<void> {
    // This method should run factory witch run command witch get last event aggregates,
    // and publish its. Without saving into db.
  }
}
