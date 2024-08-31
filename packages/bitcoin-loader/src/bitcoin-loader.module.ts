import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { CqrsModule } from '@easylayer/core/cqrs';
import { CqrsTransportModule } from '@easylayer/core/cqrs-transport';
import { LoggerModule } from '@easylayer/components/logger';
import { ArithmeticService } from '@easylayer/components/arithmetic';
import { BlocksQueueModule } from '@easylayer/core/bitcoin-blocks-queue';
import { EventStoreModule } from '@easylayer/core/eventstore';
import { ReadDatabaseModule } from '@easylayer/core/views-rdbms-db';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { IndexerController } from './bitcoin-loader.controller';
import { LoaderService } from './bitcoin-loader.service';
import { IndexerSaga } from './application-layer/sagas';
import {
  BlocksCommandFactoryService,
  IndexerCommandFactoryService,
  ReadStateExceptionHandlerService,
  ViewsQueryFactoryService,
} from './application-layer/services';
import { IndexerModelFactoryService } from './domain-layer/services';
import { ViewsReadRepositoryService, ViewsWriteRepositoryService } from './infrastructure-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import { QueryHandlers } from './infrastructure-layer/query-handlers';
import {
  AppConfig,
  BusinessConfig,
  EventStoreConfig,
  ReadDatabaseConfig,
  BlocksQueueConfig,
  ProvidersConfig,
} from './config';
import { MapperType, EntitySchema } from './protocol';
import { System } from './infrastructure-layer/view-models';

interface LoaderModuleOptions {
  appName: string;
  schemas: EntitySchema[];
  mapper: MapperType;
  //...
}

@Module({})
export class BitcoinLoaderModule {
  static async register({ appName, schemas, mapper }: LoaderModuleOptions): Promise<DynamicModule> {
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
      module: BitcoinLoaderModule,
      controllers: [IndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: appName }),
        CqrsTransportModule.forRoot({ isGlobal: true }),
        CqrsModule.forRoot({ isGlobal: true }),
        // IMPORTANT: BitcoinNetworkProviderModule must be global inside one plugin
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
          quickNodesUrls: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_QUICK_NODE_URLS,
          selfNodesUrl: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_SELF_NODE_URL,
        }),
        EventStoreModule.forRoot({
          path: `${appName}/data`,
          type: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_TYPE,
          name: 'indexer-eventstore', //eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          logging: eventstoreConfig.isLogging(),
          database: 'indexer-eventstore',
          ...(eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_HOST && {
            host: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_HOST,
          }),
          ...(eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_PORT && {
            port: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_PORT,
          }),
          ...(eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_USERNAME && {
            username: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_USERNAME,
          }),
          ...(eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_PASSWORD && {
            password: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_PASSWORD,
          }),
        }),
        ReadDatabaseModule.forRoot({
          path: `${appName}/data`,
          type: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_TYPE,
          name: 'indexer-views', //readdatabaseConfig.BITCOIN_INDEXER_READ_DB_NAME,
          logging: readdatabaseConfig.isLogging(),
          entities: [System, ...schemas],
          database: 'indexer-views',
          ...(readdatabaseConfig.BITCOIN_INDEXER_READ_DB_HOST && {
            host: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_HOST,
          }),
          ...(readdatabaseConfig.BITCOIN_INDEXER_READ_DB_PORT && {
            port: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_PORT,
          }),
          ...(readdatabaseConfig.BITCOIN_INDEXER_READ_DB_USERNAME && {
            username: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_USERNAME,
          }),
          ...(readdatabaseConfig.BITCOIN_INDEXER_READ_DB_PASSWORD && {
            password: readdatabaseConfig.BITCOIN_INDEXER_READ_DB_PASSWORD,
          }),
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
        {
          provide: 'LoaderMapper',
          useClass: mapper,
        },
        ViewsReadRepositoryService,
        ViewsWriteRepositoryService,
        ArithmeticService,
        LoaderService,
        IndexerSaga,
        BlocksCommandFactoryService,
        IndexerCommandFactoryService,
        IndexerModelFactoryService,
        ReadStateExceptionHandlerService,
        ViewsQueryFactoryService,
        ...CommandHandlers,
        ...EventsHandlers,
        ...QueryHandlers,
      ],
      exports: [],
    };
  }
}
