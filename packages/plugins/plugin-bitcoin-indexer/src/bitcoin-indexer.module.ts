import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/components/logger';
import { ArithmeticService } from '@easylayer/components/arithmetic';
import { BlocksQueueModule } from '@easylayer/core/bitcoin-blocks-queue';
import { EventStoreModule } from '@easylayer/core/eventstore';
import { ReadDatabaseModule } from '@easylayer/core/read-database';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
import { IndexerSaga } from './application-layer/sagas';
import { BlockViewModel, TransactionViewModel } from './domain-layer/view-models';
import {
  BlocksCommandFactoryService,
  IndexerCommandFactoryService,
  ReadStateExceptionHandlerService,
} from './application-layer/services';
import { IndexerModelFactoryService, BlocksReadService, TransactionsReadService } from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import {
  AppConfig,
  BusinessConfig,
  EventStoreConfig,
  ReadDatabaseConfig,
  BlocksQueueConfig,
  ProvidersConfig,
} from './config';

@Module({})
export class BitcoinIndexerModule {
  static async register(): Promise<DynamicModule> {
    const eventstoreConfig = await transformAndValidate(EventStoreConfig, process.env, {
      validator: { whitelist: true },
    });
    const readdatabaseConfig = await transformAndValidate(ReadDatabaseConfig, process.env, {
      validator: { whitelist: true },
    });
    const appConfig = await transformAndValidate(AppConfig, process.env, {
      validator: { whitelist: true },
    });
    const businessConfig = await transformAndValidate(BusinessConfig, process.env, {
      validator: { whitelist: true },
    });
    const blocksQueueConfig = await transformAndValidate(BlocksQueueConfig, process.env, {
      validator: { whitelist: true },
    });
    const providersConfig = await transformAndValidate(ProvidersConfig, process.env, {
      validator: { whitelist: true },
    });

    return {
      module: BitcoinIndexerModule,
      controllers: [IndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinIndexerPlugin' }),
        // IMPORTANT: BitcoinNetworkProviderModule must be global inside one plugin
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
          quickNodesUrls: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_QUICK_NODE_URLS,
          selfNodesUrl: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_SELF_NODE_URL,
        }),
        EventStoreModule.forRoot({
          type: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_TYPE,
          name: 'indexer-eventstore', //eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          // database: '',
          synchronize: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: eventstoreConfig.isLogging(),
        }),
        ReadDatabaseModule.forRoot({
          type: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_TYPE,
          name: 'indexer-views', //readdatabaseConfig.BITCOIN_INDEXER_READ_DB_NAME,
          // database: '',
          synchronize: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_SYNCHRONIZE,
          logging: readdatabaseConfig.isLogging(),
          entities: [BlockViewModel, TransactionViewModel],
        }),
        BlocksQueueModule.forRootAsync({
          blocksCommandExecutor: BlocksCommandFactoryService,
          isTransportMode: false,
          maxBlockHeight: businessConfig.BITCOIN_INDEXER_MAX_BLOCK_HEIGHT,
          queueWorkersNum: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM,
          maxQueueLength: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_LENGTH,
          queueLoaderStrategyName: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_STRATEGY_NAME,
          queueLoaderNetworkProviderBatchesLength:
            blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_NETWORK_PROVIDER_BATCHES_LENGTH,
          queueLoaderIntervalMs: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_INTERVAL_MS,
          queueLoaderMaxIntervalMs: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MS,
          queueLoaderMaxIntervalMultiplier:
            blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MULTIPLIER,
          queueIteratorBlocksBatchSize: blocksQueueConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_ITERATOR_BLOCKS_BATCH_SIZE,
        }),
      ],
      providers: [
        {
          provide: AppConfig,
          useValue: appConfig,
        },
        {
          provide: BusinessConfig,
          useValue: businessConfig,
        },
        {
          provide: EventStoreConfig,
          useValue: eventstoreConfig,
        },
        {
          provide: ReadDatabaseConfig,
          useValue: readdatabaseConfig,
        },
        BlocksReadService,
        TransactionsReadService,
        ArithmeticService,
        IndexerService,
        IndexerSaga,
        BlocksCommandFactoryService,
        IndexerCommandFactoryService,
        IndexerModelFactoryService,
        ReadStateExceptionHandlerService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
