import { Module, DynamicModule } from '@nestjs/common';
import { LoggerModule, AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService } from './bitcoin-network-provider.service';
import { AdapterOptions } from './node-adapters';
import { ConnectionManager } from './connection-manager';
import { BitcoinCryptoUtilsService } from './crypto-utils.service';

export type BitcoinNetworkProviderOptions = AdapterOptions[];

@Module({})
export class BitcoinNetworkProviderModule {
  static forRootAsync(adapters: BitcoinNetworkProviderOptions): DynamicModule {
    const adapterInstances = adapters.map((adapter) => {
      if (adapter.useFactory) {
        return adapter.useFactory();
        // } else if (adapter.useClass) {
        //   const factory = new adapter.useClass();
        //   return factory.createAdapter();
      } else if (adapter.useValue) {
        // Готовые экземпляры
        return adapter.useValue;
      } else {
        throw new Error('Adapter configuration is invalid.');
      }
    });

    const connectionManager = {
      provide: ConnectionManager,
      useFactory: async (logger: AppLogger) => {
        const adapters = await Promise.all(adapterInstances);
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
