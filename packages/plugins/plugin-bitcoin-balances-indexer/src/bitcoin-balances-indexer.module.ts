import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
import { ReadDatabaseModule } from '@easylayer/read-database';
import { TransactionsQueueModule } from '@easylayer/bitcoin-transactions-queue';
import { BitcoinNetworkProviderModule } from '@easylayer/bitcoin-network-provider';
import { BalancesIndexerController } from './balances-indexer.controller';
import { BalancesIndexerService } from './balances-indexer.service';
import { IndexerSaga } from './application-layer/sagas';
import { OutputViewModel, InputViewModel } from './domain-layer/view-models';
import {
  BalancesIndexerCommandFactoryService,
  ReadStateExceptionHandlerService,
  BacthesCommandFactoryService,
} from './application-layer/services';
import {
  BalancesIndexerModelFactoryService,
  TransactionModelFactoryService,
  OutputsReadService,
  InputsReadService,
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
      controllers: [BalancesIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinBalancesIndexerPlugin' }),
        EventStoreModule.forRoot({
          type: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_TYPE,
          name: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME,
          // database: '',
          synchronize: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: eventstoreConfig.isLogging(),
          enableWAL: eventstoreConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_IS_WAL,
          // Now, when attempting to perform an operation that encountered a block,
          // SQLite will attempt to retry the operation for the specified time before returning an error.
          // busyTimeout: 1000
        }),
        ReadDatabaseModule.forRoot({
          type: readdatabaseConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_TYPE,
          name: readdatabaseConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_NAME,
          // database: '',
          synchronize: readdatabaseConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_SYNCHRONIZE,
          logging: readdatabaseConfig.isLogging(),
          enableWAL: readdatabaseConfig.BITCOIN_BALANCES_INDEXER_EVENTSTORE_DB_IS_WAL,
          entities: [OutputViewModel, InputViewModel],
        }),
        TransactionsQueueModule.forRootAsync({
          batchesCommandExecutor: BacthesCommandFactoryService,
          isTransportMode: appConfig.BITCOIN_BALANCES_INDEXER_IS_TRANSPORT_MODE,
          maxBlockHeight: businessConfig.BITCOIN_BALANCES_INDEXER_MAX_BLOCK_HEIGHT,
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
        OutputsReadService,
        InputsReadService,
        ArithmeticService,
        BalancesIndexerService,
        BalancesIndexerModelFactoryService,
        BacthesCommandFactoryService,
        IndexerSaga,
        BalancesIndexerCommandFactoryService,
        ReadStateExceptionHandlerService,
        TransactionModelFactoryService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
