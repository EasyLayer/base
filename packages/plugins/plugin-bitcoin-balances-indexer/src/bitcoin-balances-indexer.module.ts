import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
import { ReadDatabaseModule } from '@easylayer/read-database';
import { BitcoinNetworkProviderModule } from '@easylayer/bitcoin-network-provider';
import { BitcoinBalancesIndexerController } from './bitcoin-balances-indexer.controller';
import { BitcoinBalancesIndexerService } from './bitcoin-balances-indexer.service';
import { IndexerSaga } from './application-layer/sagas';
import { IndexerCommandFactoryService, ReadStateExceptionHandlerService } from './application-layer/services';
import {
  BalancesIndexerModelFactoryService,
  TransactionModelFactoryService,
  OutputsReadService,
} from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import { AppConfig, EventStoreConfig, ReadDatabaseConfig, BusinessConfig } from './config';

@Module({})
export class BitcoinBalancesIndexerModule {
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

    return {
      module: BitcoinBalancesIndexerModule,
      controllers: [BitcoinBalancesIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinBalancesIndexerPlugin' }),
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
          entities: [],
        }),
        // IMPORTANT: BitcoinNetworkProviderModule must be global inside one plugin
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
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
        BalancesIndexerModelFactoryService,
        ArithmeticService,
        BitcoinBalancesIndexerService,
        IndexerSaga,
        IndexerCommandFactoryService,
        ReadStateExceptionHandlerService,
        TransactionModelFactoryService,
        OutputsReadService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
