import { DynamicModule, Module, Type } from '@nestjs/common';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/core/bitcoin-network-provider';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { BlocksQueueController } from './blocks-queue.controller';
import { BlocksQueueService } from './blocks-queue.service';
import { BlocksQueueIteratorService } from './blocks-iterator';
import { BlocksQueueLoaderService } from './blocks-loader';
import { BlocksQueueCollectorService } from './blocks-collector';
import { BlocksCommandExecutor } from './interfaces';

export interface BlocksQueueModuleOptions {
  blocksCommandExecutor: Type<BlocksCommandExecutor>;
  isTransportMode: boolean;
  maxBlockHeight: number;
  queueWorkersNum: number;
  maxQueueLength: number;
  queueLoaderStrategyName: string;
  queueLoaderNetworkProviderBatchesLength: number;
  queueLoaderIntervalMs: number;
  queueLoaderMaxIntervalMs: number;
  queueLoaderMaxIntervalMultiplier: number;
  queueIteratorBlocksBatchSize: number;
}

@Module({})
export class BlocksQueueModule {
  static async forRootAsync(config: BlocksQueueModuleOptions): Promise<DynamicModule> {
    const { blocksCommandExecutor, isTransportMode, maxBlockHeight, ...restConfig } = config;

    return {
      module: BlocksQueueModule,
      controllers: [BlocksQueueController],
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinBlocksQueueComponent' })],
      providers: [
        {
          // IMPORTANT:
          provide: 'BlocksCommandExecutor',
          useClass: blocksCommandExecutor,
        },
        {
          provide: 'BlocksQueueService',
          useFactory: (logger, iterator, loader, collector) =>
            new BlocksQueueService(logger, iterator, loader, collector, { ...restConfig, maxBlockHeight }),
          inject: [AppLogger, BlocksQueueIteratorService, BlocksQueueLoaderService, BlocksQueueCollectorService],
        },
        {
          provide: BlocksQueueLoaderService,
          useFactory: (logger, networkProvider, webhookStreamService) =>
            new BlocksQueueLoaderService(logger, networkProvider, webhookStreamService, {
              ...restConfig,
              isTransportMode,
            }),
          inject: [AppLogger, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
        {
          provide: BlocksQueueIteratorService,
          useFactory: (logger, executor) => new BlocksQueueIteratorService(logger, executor, { ...restConfig }),
          inject: [AppLogger, 'BlocksCommandExecutor'],
        },
        BlocksQueueCollectorService,
      ],
      exports: ['BlocksQueueService'],
    };
  }
}
