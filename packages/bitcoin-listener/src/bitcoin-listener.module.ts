import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { CqrsModule } from '@easylayer/core/cqrs';
import { CqrsTransportModule } from '@easylayer/core/cqrs-transport';
import { LoggerModule } from '@easylayer/components/logger';
import { ArithmeticService } from '@easylayer/components/arithmetic';
import { BlocksQueueModule } from '@easylayer/core/bitcoin-blocks-queue';
import { ViewsKeyValueDatabaseModule } from '@easylayer/core/views-keyvalue-db';
import { WebsocketMessagesModule } from '@easylayer/core/websocket-messages';
import { EventStoreModule } from '@easylayer/core/eventstore';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { ListenerController } from './bitcoin-listener.controller';
import { ListenerService } from './bitcoin-listener.service';
import { ListenerSaga, WsMessagesSaga } from './application-layer/sagas';
import {
  BlocksCommandFactoryService,
  ListenerCommandFactoryService,
  ReadStateExceptionHandlerService,
} from './application-layer/services';
import { ListenerModelFactoryService } from './domain-layer/services';
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
import { MapperType } from './protocol';
import { BitcoinListenerGateway } from './infrastructure-layer/listener.gateway';
import { EventSchema, LastBlockSchema } from './infrastructure-layer/view-models';
import {
  ViewsReadRepositoryService,
  ViewsWriteRepositoryService,
  WsMessagesService,
} from './infrastructure-layer/services';

interface LoaderModuleOptions {
  appName: string;
  mapper: MapperType;
  //...
}

@Module({})
export class BitcoinListenerModule {
  static async register({ appName, mapper }: LoaderModuleOptions): Promise<DynamicModule> {
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
      module: BitcoinListenerModule,
      controllers: [ListenerController],
      imports: [
        LoggerModule.forRoot({ componentName: appName }),
        CqrsTransportModule.forRoot({ isGlobal: true }),
        CqrsModule.forRoot({ isGlobal: true }),
        WebsocketMessagesModule.forRootAsync({}),
        // IMPORTANT: BitcoinNetworkProviderModule must be global inside one plugin
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
          quickNodesUrls: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_QUICK_NODE_URLS,
          selfNodesUrl: providersConfig.BITCOIN_INDEXER_NETWORK_PROVIDER_SELF_NODE_URL,
        }),
        EventStoreModule.forRoot({
          path: `${appName}/data`,
          type: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_TYPE,
          name: 'listener-eventstore', //eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          logging: eventstoreConfig.isLogging(),
          database: 'listener-eventstore',
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
        ViewsKeyValueDatabaseModule.forRoot({
          path: `${appName}/data`,
          type: 'rocksdb',
          name: 'listener',
          schemas: [EventSchema, LastBlockSchema],
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
          provide: 'ListenerMapper',
          useClass: mapper,
        },
        ViewsReadRepositoryService,
        ViewsWriteRepositoryService,
        WsMessagesService,
        BitcoinListenerGateway,
        ArithmeticService,
        ListenerService,
        ListenerSaga,
        WsMessagesSaga,
        BlocksCommandFactoryService,
        ListenerCommandFactoryService,
        ListenerModelFactoryService,
        ReadStateExceptionHandlerService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
