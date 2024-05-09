import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { EventStoreModule } from '@easylayer/eventstore';
import { BitcoinNetworkProviderModule, QuickNodeProvider } from '@easylayer/bitcoin-network-provider';
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

    // TODO: we must be able to parse provider configs correctly, group them and send them to the provider module (without creating the provider directly here).
    // NOTE: Passing the provider factory is required for custom providers.   
     
    // Create QuickNode providers
    const quickNodeProvidersOptions = [];
    for (const quickNodeProvider of providersConfig.QUICK_NODE_BASE_URLS) {
      quickNodeProvidersOptions.push({
        // useFactory: () =>
        //   new QuickNodeAdapter({
        //     name: uuidv4(), // random name //'Quick Node Bitcoin',
        //     baseUrl: quickNodeProvider,
        //   }),
        type: 'quicknode',
        name: uuidv4(),
        baseUrl: quickNodeProvider
      });
    }

    // const providers = [{ connection:  }]

    return {
      module: BitcoinIndexerModule,
      controllers: [BitcoinIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinIndexerModule' }),
        BitcoinNetworkProviderModule.forRootAsync({
          providers: [
          ]
        }),
        // TODO: move condigs into envs
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
