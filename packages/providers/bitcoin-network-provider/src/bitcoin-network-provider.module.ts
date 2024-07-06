import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidate } from 'class-transformer-validator';
import { LoggerModule, AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService } from './bitcoin-network-provider.service';
import { ConnectionManager } from './connection-manager';
import { BitcoinCryptoUtilsService } from './crypto-utils.service';
import { BitcoinWebhookStreamService } from './bitcoin-webhook-stream.service';
import { createProvider, ProviderOptions, QuickNodeProvider } from './node-providers';
import { ProvidersConfig } from './config';

export interface BitcoinNetworkProviderModuleOptions {
  providers?: ProviderOptions[];
  isGlobal?: boolean;
}

@Module({})
export class BitcoinNetworkProviderModule {
  static async forRootAsync(options: BitcoinNetworkProviderModuleOptions): Promise<DynamicModule> {
    const { providers, isGlobal } = options;

    const providersConfig = await transformAndValidate(ProvidersConfig, process.env, {
      transformer: { enableImplicitConversion: true },
      validator: { whitelist: true },
    });

    // Create QuickNode providers
    const quickNodeProviders: ProviderOptions[] = [];
    if (providersConfig.BITCOIN_QUICK_NODE_BASE_URLS) {
      for (const quickNodeProviderOption of providersConfig.BITCOIN_QUICK_NODE_BASE_URLS) {
        quickNodeProviders.push({
          useFactory: () =>
            new QuickNodeProvider({
              uniqName: uuidv4(),
              baseUrl: quickNodeProviderOption,
            }),
        });
      }
    }

    // Create SelfNode providers
    const selfNodeProviders: ProviderOptions[] = [];
    // if (
    //   providersConfig.BITCOIN_SELF_NODE_HOST
    //   && providersConfig.BITCOIN_SELF_NODE_NETWORK
    //   && providersConfig.BITCOIN_SELF_NODE_PASSWORD
    //   && providersConfig.BITCOIN_SELF_NODE_PORT
    //   && providersConfig.BITCOIN_SELF_NODE_USERNAME
    // ) {
    //   selfNodeProviders.push({
    //     useFactory: () =>
    //       new SelfNodeProvider({
    //         uniqName: uuidv4(),
    //         host: `http://${}`,
    //         port: providersConfig.BITCOIN_SELF_NODE_PORT!,
    //       }),
    //   })
    // }

    const providersToConnect: ProviderOptions[] = [...quickNodeProviders, ...selfNodeProviders, ...(providers || [])];

    const providersInstance = providersToConnect.map(async (providerOptions) => {
      if (providerOptions.useFactory) {
        return await providerOptions.useFactory();
      } else if (providerOptions.connection) {
        const { connection } = providerOptions;
        return createProvider(connection);
      } else {
        throw new Error('Provider configuration is invalid.');
      }
    });

    const connectionManager = {
      provide: ConnectionManager,
      useFactory: async (logger: AppLogger) => {
        const adapters = await Promise.all(providersInstance);
        return new ConnectionManager(adapters, logger);
      },
      inject: [AppLogger],
    };

    return {
      module: BitcoinNetworkProviderModule,
      global: isGlobal || false,
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinNetworkProviderModule' })],
      providers: [
        {
          provide: ProvidersConfig,
          useValue: providersConfig,
        },
        BitcoinNetworkProviderService,
        BitcoinWebhookStreamService,
        connectionManager,
        BitcoinCryptoUtilsService,
      ],
      exports: [
        BitcoinNetworkProviderService,
        BitcoinWebhookStreamService,
        ConnectionManager,
        BitcoinCryptoUtilsService,
      ],
    };
  }
}
