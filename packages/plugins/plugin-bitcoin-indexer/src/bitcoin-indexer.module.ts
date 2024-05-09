import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { EventStoreModule } from '@easylayer/eventstore';
import { BitcoinNetworkProviderModule, QuickNodeProvider, SelfNodeProvider } from '@easylayer/bitcoin-network-provider';
import { BitcoinIndexerController } from './bitcoin-indexer.controller';
import { BitcoinIndexerService } from './bitcoin-indexer.service';
import { AppConfig, ProvidersConfig } from './config';
import { BlocksQueueService } from './application-layer/blocks-queue';
import { IndexerSaga } from './application-layer/sagas';
import {
  BlocksCommandFactoryService,
  NetworkCommandFactoryService,
  TransactionsCommandFactoryService
} from './application-layer/services';
import {
  BlockModelFactoryService,
  NetworkModelFactoryService,
  TransactionsBatchModelFactoryService
} from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';

@Module({})
export class BitcoinIndexerModule {
  static register(): DynamicModule {
    const providersConfig = transformAndValidateSync(ProvidersConfig, process.env, {
      transformer: { enableImplicitConversion: true },
      validator: { whitelist: true },
    });
    
    // Create QuickNode providers
    const quickNodeProviders = [];
    for (const quickNodeProviderOption of providersConfig.QUICK_NODE_BASE_URLS) {
      quickNodeProviders.push({
        useFactory: () =>
          new QuickNodeProvider({
            uniqName: uuidv4(),
            baseUrl: quickNodeProviderOption,
          }), 
      });
    }

    return {
      module: BitcoinIndexerModule,
      controllers: [BitcoinIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinIndexerModule' }),
        BitcoinNetworkProviderModule.forRootAsync({
          providers: [
            ...quickNodeProviders
          ]
        }),
        // TODO: move configs into envs
        EventStoreModule.forRoot({
          type: 'sqlite',
          name: 'indexer-write',
          // database: '',
          synchronize: true,
          logging: true,
          enableWAL: true,
          // Now, when attempting to perform an operation that encountered a block,
          // SQLite will attempt to retry the operation for the specified time before returning an error. 
          // busyTimeout: 1000
        })
      ],
      providers: [
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env, {
            transformer: { enableImplicitConversion: true },
            validator: { whitelist: true },
          }),
        },
        {
          provide: ProvidersConfig,
          useValue: providersConfig,
        },
        BitcoinIndexerService,
        BlocksQueueService,
        IndexerSaga,
        BlocksCommandFactoryService,
        NetworkCommandFactoryService,
        TransactionsCommandFactoryService,
        BlockModelFactoryService,
        NetworkModelFactoryService,
        TransactionsBatchModelFactoryService,
        ...CommandHandlers
      ],
      exports: [],
    };
  }
}
