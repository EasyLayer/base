import { DynamicModule, Module, Type } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/core/bitcoin-network-provider';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { BlocksQueueController } from './blocks-queue.controller';
import { BlocksQueueService } from './blocks-queue.service';
import { BlocksQueueIteratorService } from './blocks-iterator';
import { BlocksQueueLoaderService } from './blocks-loader';
import { BlocksQueueCollectorService } from './blocks-collector';
import { BlocksCommandExecutor } from './interfaces';
import { BlocksQueueConfig } from './config/blocks-queue.config';

export interface BlocksQueueModuleOptions {
  blocksCommandExecutor: Type<BlocksCommandExecutor>;
  isTransportMode: boolean;
  maxBlockHeight: number;
}

@Module({})
export class BlocksQueueModule {
  static async forRootAsync({
    blocksCommandExecutor,
    isTransportMode,
    maxBlockHeight,
  }: BlocksQueueModuleOptions): Promise<DynamicModule> {
    const blocksQueueConfig = await transformAndValidate(BlocksQueueConfig, process.env, {
      validator: { whitelist: true },
    });

    return {
      module: BlocksQueueModule,
      controllers: [BlocksQueueController],
      imports: [LoggerModule.forRoot({ componentName: 'BlocksQueueComponent' })],
      providers: [
        {
          provide: BlocksQueueConfig,
          useValue: blocksQueueConfig,
        },
        {
          // IMPORTANT:
          provide: 'BlocksCommandExecutor',
          useClass: blocksCommandExecutor,
        },
        {
          provide: 'BlocksQueueService',
          useFactory: (logger, iterator, loader, config, collector) =>
            new BlocksQueueService(logger, iterator, loader, config, collector, { maxBlockHeight }),
          inject: [
            AppLogger,
            BlocksQueueIteratorService,
            BlocksQueueLoaderService,
            BlocksQueueConfig,
            BlocksQueueCollectorService,
          ],
        },
        {
          provide: BlocksQueueLoaderService,
          useFactory: (logger, config, networkProvider, webhookStreamService) =>
            new BlocksQueueLoaderService(logger, config, networkProvider, webhookStreamService, {
              isTransportMode,
            }),
          inject: [AppLogger, BlocksQueueConfig, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
        BlocksQueueIteratorService,
        BlocksQueueCollectorService,
      ],
      exports: ['BlocksQueueService'],
    };
  }
}
