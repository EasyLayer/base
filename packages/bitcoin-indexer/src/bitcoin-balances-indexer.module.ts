import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/components/logger';
import { ArithmeticService } from '@easylayer/components/arithmetic';
import { EventStoreModule } from '@easylayer/core/eventstore';
import { CqrsModule } from '@easylayer/core/cqrs';
import { CqrsTransportModule } from '@easylayer/core/cqrs-transport';
import { ViewsKeyValueDatabaseModule } from '@easylayer/core/views-keyvalue-db';
import { BlocksQueueModule } from '@easylayer/core/bitcoin-blocks-queue';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { BalancesIndexerController } from './balances-indexer.controller';
import { BalancesIndexerService } from './balances-indexer.service';
import { IndexerSaga } from './application-layer/sagas';
import {
  BalancesIndexerCommandFactoryService,
  ReadStateExceptionHandlerService,
  BlocksCommandFactoryService,
  ViewsQueryFactoryService,
} from './application-layer/services';
import { ViewsReadRepositoryService, ViewsWriteRepositoryService } from './infrastructure-layer/services';
import { LastBlockSchema } from './infrastructure-layer/view-models';
import { BalancesIndexerModelFactoryService } from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import { QueryHandlers } from './infrastructure-layer/query-handlers';
import {
  AppConfig,
  EventStoreConfig,
  ReadDatabaseConfig,
  BusinessConfig,
  BlocksQueueConfig,
  ProvidersConfig,
} from './config';
import { Schema, MapperType } from './protocol';

interface IndexerModuleOptions {
  appName: string;
  schemas: Schema[];
  mapper: MapperType;
  //...
}

@Module({})
export class BitcoinBalancesIndexerModule {
  static async register({ appName, schemas, mapper }: IndexerModuleOptions): Promise<DynamicModule> {
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
      module: BitcoinBalancesIndexerModule,
      controllers: [BalancesIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinBalancesIndexerPlugin' }),
        CqrsTransportModule.forRoot({ isGlobal: true }),
        CqrsModule.forRoot({ isGlobal: true }),
        // IMPORTANT: BitcoinNetworkProviderModule must be global inside one plugin
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
          quickNodesUrls: providersConfig.BITCOIN_BALANCES_INDEXER_NETWORK_PROVIDER_QUICK_NODE_URLS,
          selfNodesUrl: providersConfig.BITCOIN_BALANCES_INDEXER_NETWORK_PROVIDER_SELF_NODE_URL,
        }),
        EventStoreModule.forRoot({
          path: `${appName}/data`,
          type: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_TYPE,
          name: 'balances-indexer-eventstore', //eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME,
          synchronize: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: eventstoreConfig.isLogging(),
          database: 'balances-indexer-eventstore',
          ...(eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_HOST && {
            host: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_HOST,
          }),
          ...(eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_PORT && {
            port: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_PORT,
          }),
          ...(eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_USERNAME && {
            username: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_USERNAME,
          }),
          ...(eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_PASSWORD && {
            password: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_PASSWORD,
          }),
        }),
        BlocksQueueModule.forRootAsync({
          blocksCommandExecutor: BlocksCommandFactoryService,
          isTransportMode: appConfig.BITCOIN_BALANCES_INDEXER_IS_TRANSPORT_MODE,
          maxBlockHeight: businessConfig.BITCOIN_BALANCES_INDEXER_MAX_BLOCK_HEIGHT,
          queueWorkersNum: blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_WORKERS_NUM,
          maxQueueLength: blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_MAX_LENGTH,
          queueLoaderStrategyName: blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_LOADER_STRATEGY_NAME,
          queueLoaderNetworkProviderBatchesLength:
            blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_LOADER_NETWORK_PROVIDER_BATCHES_LENGTH,
          queueLoaderIntervalMs: blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_LOADER_INTERVAL_MS,
          queueLoaderMaxIntervalMs: blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MS,
          queueLoaderMaxIntervalMultiplier:
            blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_LOADER_MAX_INTERVAL_MULTIPLIER,
          queueIteratorBlocksBatchSize:
            blocksQueueConfig.BITCOIN_BALANCES_INDEXER_BLOCKS_QUEUE_ITERATOR_BLOCKS_BATCH_SIZE,
        }),
        ViewsKeyValueDatabaseModule.forRoot({
          path: `${appName}/data`,
          type: 'rocksdb',
          name: 'indexer',
          schemas: [LastBlockSchema, ...schemas],
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
          provide: 'IndexerMapper',
          useClass: mapper,
        },
        ViewsQueryFactoryService,
        ViewsReadRepositoryService,
        ViewsWriteRepositoryService,
        ArithmeticService,
        BalancesIndexerService,
        BalancesIndexerModelFactoryService,
        BlocksCommandFactoryService,
        IndexerSaga,
        BalancesIndexerCommandFactoryService,
        ReadStateExceptionHandlerService,
        ...CommandHandlers,
        ...EventsHandlers,
        ...QueryHandlers,
      ],
      exports: [],
    };
  }
}
