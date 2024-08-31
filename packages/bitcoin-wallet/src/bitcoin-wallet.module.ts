import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { CqrsModule } from '@easylayer/core/cqrs';
import { CqrsTransportModule } from '@easylayer/core/cqrs-transport';
import { LoggerModule } from '@easylayer/components/logger';
import { ArithmeticService } from '@easylayer/components/arithmetic';
import { EventStoreModule } from '@easylayer/core/eventstore';
import { SecureStorageModule } from '@easylayer/core/secure-storage';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { WalletController } from './bitcoin-wallet.controller';
import { WalletService } from './bitcoin-wallet.service';
import { KeysPairSaga } from './application-layer/sagas';
import { ReadStateExceptionHandlerService, WalletCommandFactoryService } from './application-layer/services';
import { WalletModelFactoryService } from './domain-layer/services';
import { ViewsEventsResponseService, KeysStorageRepositoryService } from './infrastructure-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { EventsHandlers } from './domain-layer/events-handlers';
import { AppConfig, BusinessConfig, EventStoreConfig, ReadDatabaseConfig, ProvidersConfig } from './config';
import { KeysViewModel } from './infrastructure-layer/view-models';

interface WalletModuleOptions {
  appName: string;
  //...
}

@Module({})
export class BitcoinWalletModule {
  static async register({ appName }: WalletModuleOptions): Promise<DynamicModule> {
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
    const providersConfig = await transformAndValidate(ProvidersConfig, process.env, {
      validator: { whitelist: true },
    });

    return {
      module: BitcoinWalletModule,
      controllers: [WalletController],
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
          name: 'wallet-eventstore', //eventstoreConfig.BITCOIN_INDEXER_EVENTSTORE_DB_NAME,
          logging: eventstoreConfig.isLogging(),
          database: 'wallet-eventstore',
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
        SecureStorageModule.forRoot({
          path: `${appName}/data`,
          type: 'better-sqlite3',
          name: 'keys-storage',
          logging: readdatabaseConfig.isLogging(),
          entities: [KeysViewModel],
          database: 'keys-storage',
          password: 'testpassword',
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
        KeysStorageRepositoryService,
        WalletCommandFactoryService,
        ViewsEventsResponseService,
        ArithmeticService,
        WalletService,
        KeysPairSaga,
        ViewsEventsResponseService,
        WalletModelFactoryService,
        ReadStateExceptionHandlerService,
        ...CommandHandlers,
        ...EventsHandlers,
      ],
      exports: [],
    };
  }
}
