import { Module, DynamicModule } from '@nestjs/common';
import { LoggerModule, AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService } from './bitcoin-network-provider.service';
import { ConnectionManager } from './connection-manager';
import { BitcoinCryptoUtilsService } from './crypto-utils.service';
import { createProvider, ProviderOptions } from './node-providers';

export interface BitcoinNetworkProviderModuleOptions {
  providers: ProviderOptions[];
}

@Module({})
export class BitcoinNetworkProviderModule {
  static forRootAsync(options: BitcoinNetworkProviderModuleOptions): DynamicModule {
    const { providers } = options;

    const providersInstance = providers.map(async (providerOptions) => {
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
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinNetworkProviderModule' })],
      providers: [BitcoinNetworkProviderService, connectionManager, BitcoinCryptoUtilsService],
      exports: [BitcoinNetworkProviderService, ConnectionManager, BitcoinCryptoUtilsService],
    };
  }
}
