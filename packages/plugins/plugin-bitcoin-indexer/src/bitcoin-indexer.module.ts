import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
import { BlocksQueueModule } from '@easylayer/bitcoin-blocks-queue';
import { ReadDatabaseModule } from '@easylayer/read-database';
import { BitcoinNetworkProviderModule } from '@easylayer/bitcoin-network-provider';
import { BitcoinIndexerController } from './bitcoin-indexer.controller';
import { BitcoinIndexerService } from './bitcoin-indexer.service';
import { IndexerSaga } from './application-layer/sagas';
import { BlockViewModel, TransactionViewModel } from './domain-layer/view-models';
import {
  BlocksCommandFactoryService,
  IndexerCommandFactoryService,
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
import { AppConfig, BusinessConfig, EventStoreConfig, ReadDatabaseConfig } from './config';

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

    return {
      module: BitcoinIndexerModule,
      controllers: [BitcoinIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinIndexerPlugin' }),
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
        BlocksQueueModule.forRootAsync({
          blocksCommandExecutor: BlocksCommandFactoryService,
          isTransportMode: appConfig.BITCOIN_INDEXER_IS_TRANSPORT_MODE,
          maxBlockHeight: businessConfig.BITCOIN_INDEXER_MAX_BLOCK_HEIGHT,
        }),
        BitcoinNetworkProviderModule.forRootAsync({
          isGlobal: true,
        }),
      ],
      providers: [
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
        BitcoinIndexerService,
        IndexerSaga,
        BlocksCommandFactoryService,
        IndexerCommandFactoryService,
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
