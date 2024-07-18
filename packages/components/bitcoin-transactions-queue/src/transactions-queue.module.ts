import { DynamicModule, Module, Type } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule, AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { TransactionsQueueController } from './transactions-queue.controller';
import { TransactionsQueueService } from './transactions-queue.service';
import { BatchesQueueIteratorService } from './batches-iterator';
import { BatchesQueueLoaderService } from './batches-loader';
import { BatchesQueueCollectorService } from './batches-collector';
import { BatchesCommandExecutor } from './interfaces';
import { TransactionsQueueConfig } from './config/transactions-queue.config';

export interface TransactionsQueueModuleOptions {
  batchesCommandExecutor: Type<BatchesCommandExecutor>;
  isTransportMode: boolean;
  maxBlockHeight: number;
}

@Module({})
export class TransactionsQueueModule {
  static async forRootAsync({
    batchesCommandExecutor,
    isTransportMode,
    maxBlockHeight,
  }: TransactionsQueueModuleOptions): Promise<DynamicModule> {
    const transactionsQueueConfig = await transformAndValidate(TransactionsQueueConfig, process.env, {
      validator: { whitelist: true },
    });

    return {
      module: TransactionsQueueModule,
      controllers: [TransactionsQueueController],
      imports: [LoggerModule.forRoot({ componentName: 'TransactionsQueueComponent' })],
      providers: [
        {
          provide: TransactionsQueueConfig,
          useValue: transactionsQueueConfig,
        },
        {
          // IMPORTANT:
          provide: 'BatchesCommandExecutor',
          useClass: batchesCommandExecutor,
        },
        {
          provide: 'TransactionsQueueService',
          useFactory: (logger, iterator, loader, config, collector) =>
            new TransactionsQueueService(logger, iterator, loader, config, collector, { maxBlockHeight }),
          inject: [
            AppLogger,
            BatchesQueueIteratorService,
            BatchesQueueLoaderService,
            TransactionsQueueConfig,
            BatchesQueueCollectorService,
          ],
        },
        {
          provide: BatchesQueueLoaderService,
          useFactory: (logger, config, collector, networkProvider, webhookStreamService) =>
            new BatchesQueueLoaderService(logger, config, collector, networkProvider, webhookStreamService, {
              isTransportMode,
            }),
          inject: [
            AppLogger,
            TransactionsQueueConfig,
            BatchesQueueCollectorService,
            BitcoinNetworkProviderService,
            BitcoinWebhookStreamService,
          ],
        },
        BatchesQueueIteratorService,
        BatchesQueueCollectorService,
      ],
      exports: ['TransactionsQueueService'],
    };
  }
}
