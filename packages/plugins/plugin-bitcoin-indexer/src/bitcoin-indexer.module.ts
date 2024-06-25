import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
import { ReadDatabaseModule } from '@easylayer/read-database';
import { BitcoinNetworkProviderModule, QuickNodeProvider } from '@easylayer/bitcoin-network-provider';
import { BitcoinIndexerController } from './bitcoin-indexer.controller';
import { BitcoinIndexerService } from './bitcoin-indexer.service';
import { BlocksQueueService } from './application-layer/blocks-queue';
import { IndexerSaga } from './application-layer/sagas';
import { BlockViewModel, TransactionViewModel } from './domain-layer/view-models';
import {
  BlocksCommandFactoryService,
  IndexerCommandFactoryService,
  TransactionsCommandFactoryService,
  ReadStateExceptionHandlerService,
} from './application-layer/services';
import {
  BlockModelFactoryService,
  IndexerModelFactoryService,
  TransactionsBatchModelFactoryService,
  BlocksReadService,
  TransactionsReadService,
} from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import { AppConfig, ProvidersConfig, SystemConfig, EventStoreConfig, ReadDatabaseConfig } from './config';

@Module({})
export class BitcoinIndexerModule {
  static async register(): Promise<DynamicModule> {
    const providersConfig = await transformAndValidate(ProvidersConfig, process.env, {
      transformer: { enableImplicitConversion: true },
      validator: { whitelist: true },
    });
    const eventstoreConfig = await transformAndValidate(EventStoreConfig, process.env, {
      validator: { whitelist: true },
    });
    const readdatabaseConfig = await transformAndValidate(ReadDatabaseConfig, process.env, {
      validator: { whitelist: true },
    });

    // Create QuickNode providers
    const quickNodeProviders = [];
    if (providersConfig.QUICK_NODE_BASE_URLS) {
      for (const quickNodeProviderOption of providersConfig.QUICK_NODE_BASE_URLS) {
        quickNodeProviders.push({
          useFactory: () =>
            new QuickNodeProvider({
              uniqName: uuidv4(),
              baseUrl: quickNodeProviderOption,
            }),
        });
      }
    }

    return {
      module: BitcoinIndexerModule,
      controllers: [BitcoinIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinIndexerModule' }),
        BitcoinNetworkProviderModule.forRootAsync({
          providers: [...quickNodeProviders],
        }),
        // TODO: move configs into envs
        EventStoreModule.forRoot({
          type: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_TYPE,
          name: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          // database: '',
          synchronize: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: eventstoreConfig.isLogging(),
          enableWAL: eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_IS_WAL,
          // Now, when attempting to perform an operation that encountered a block,
          // SQLite will attempt to retry the operation for the specified time before returning an error.
          // busyTimeout: 1000
        }),
        ReadDatabaseModule.forRoot({
          type: readdatabaseConfig.BITCOIN_INDEXER_EVENTSTORE_DB_TYPE,
          name: readdatabaseConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          // database: '',
          synchronize: readdatabaseConfig.BITCOIN_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: readdatabaseConfig.isLogging(),
          enableWAL: readdatabaseConfig.BITCOIN_INDEXER_EVENTSTORE_DB_IS_WAL,
          entities: [BlockViewModel, TransactionViewModel],
        }),
      ],
      providers: [
        {
          provide: AppConfig,
          useFactory: async () =>
            transformAndValidate(AppConfig, process.env, {
              validator: { whitelist: true },
            }),
        },
        {
          provide: SystemConfig,
          useFactory: async () =>
            transformAndValidate(SystemConfig, process.env, {
              validator: { whitelist: true },
            }),
        },
        {
          provide: ProvidersConfig,
          useValue: providersConfig,
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
          // IMPORTANT: We use such provider connections for services
          // to which we will need access in the future for service override by string token.
          provide: 'BlocksQueueService',
          useClass: BlocksQueueService,
        },
        BlocksReadService,
        TransactionsReadService,
        ArithmeticService,
        BitcoinIndexerService,
        IndexerSaga,
        BlocksCommandFactoryService,
        IndexerCommandFactoryService,
        TransactionsCommandFactoryService,
        BlockModelFactoryService,
        IndexerModelFactoryService,
        TransactionsBatchModelFactoryService,
        ReadStateExceptionHandlerService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
