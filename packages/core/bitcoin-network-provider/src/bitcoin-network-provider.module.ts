import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { BitcoinNetworkProviderService } from './bitcoin-network-provider.service';
import { ConnectionManager } from './connection-manager';
import { BitcoinCryptoUtilsService } from './crypto-utils.service';
import { BitcoinWebhookStreamService } from './bitcoin-webhook-stream.service';
import { createProvider, ProviderOptions, QuickNodeProvider, SelfNodeProvider } from './node-providers';

export interface BitcoinNetworkProviderModuleOptions {
  providers?: ProviderOptions[];
  isGlobal?: boolean;
  quickNodesUrls?: string[];
  selfNodesUrl?: string;
}

@Module({})
export class BitcoinNetworkProviderModule {
  static async forRootAsync(options: BitcoinNetworkProviderModuleOptions): Promise<DynamicModule> {
    const { providers, isGlobal, quickNodesUrls, selfNodesUrl } = options;

    // Create QuickNode providers
    const quickNodeProviders: ProviderOptions[] = [];
    if (quickNodesUrls) {
      for (const quickNodeProviderOption of quickNodesUrls) {
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
    if (selfNodesUrl) {
      selfNodeProviders.push({
        useFactory: () =>
          new SelfNodeProvider({
            uniqName: uuidv4(),
            baseUrl: selfNodesUrl,
          }),
      });
    }

    const providersToConnect: ProviderOptions[] = [...quickNodeProviders, ...selfNodeProviders, ...(providers || [])];

    if (providersToConnect.length === 0) {
      throw new Error('Provider configuration is invalid.');
    }

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
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinNetworkProviderComponent' })],
      providers: [
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
