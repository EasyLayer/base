import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { BitcoinNetworkProviderModule, QuickNodeAdapter } from '@easylayer/bitcoin-network-provider';
import { BitcoinIndexerController } from './bitcoin-indexer.controller';
import { BitcoinIndexerService } from './bitcoin-indexer.service';
import { AppConfig, ProvidersConfig } from './config';
import { BitcoinBlocksModule } from './blocks-component/blocks.module';
import { BitcoinTransactionsModule } from './transactions-component/transactions.module';

@Module({})
export class BitcoinIndexerModule {
  static register(): DynamicModule {
    const providersConfig = transformAndValidateSync(ProvidersConfig, process.env, {
      transformer: { enableImplicitConversion: true },
      validator: { whitelist: true },
    });

    // Create QuickNode providers
    const quickNodeProvidersFactories = [];
    for (const quickNodeProvider of providersConfig.QUICK_NODE_BASE_URLS) {
      quickNodeProvidersFactories.push({
        useFactory: () =>
          new QuickNodeAdapter({
            name: uuidv4(), // random name //'Quick Node Bitcoin',
            baseUrl: quickNodeProvider,
          }),
      });
    }

    return {
      module: BitcoinIndexerModule,
      controllers: [BitcoinIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinBlocksIndexerModule' }),
        BitcoinNetworkProviderModule.forRootAsync([
          // {
          //   useFactory: () => new SelfNodeAdapter({
          //     name: 'Self Node Yaroslav Mac',
          //     host: providersConfig.SELF_NODE_HOST,
          //     network: providersConfig.SELF_NODE_NETWORK,
          //     port: providersConfig.SELF_NODE_PORT,
          //     password: providersConfig.SELF_NODE_PASSWORD,
          //     username: providersConfig.SELF_NODE_USERNAMR
          //   }),
          // },
          ...quickNodeProvidersFactories,
        ]),
        BitcoinBlocksModule,
        BitcoinTransactionsModule,
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
      ],
      exports: [BitcoinIndexerService],
    };
  }
}
