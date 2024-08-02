import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderModule, BitcoinNetworkProviderModuleOptions } from '../bitcoin-network-provider.module';
import { BitcoinNetworkProviderService } from '../bitcoin-network-provider.service';
import { ConnectionManager } from '../connection-manager';
import { BitcoinCryptoUtilsService } from '../crypto-utils.service';
import { BitcoinWebhookStreamService } from '../bitcoin-webhook-stream.service';
import { ProvidersConfig } from '../config';

describe('BitcoinNetworkProviderModule', () => {
  let module: TestingModule;
  let service: BitcoinNetworkProviderService;

  const moduleOptions: BitcoinNetworkProviderModuleOptions = {
    isGlobal: false,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BitcoinNetworkProviderModule.forRootAsync(moduleOptions)],
    }).compile();

    service = module.get<BitcoinNetworkProviderService>(BitcoinNetworkProviderService);
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have BitcoinNetworkProviderService', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BitcoinNetworkProviderService);
  });

  it('should have ConnectionManager', () => {
    const connectionManager = module.get<ConnectionManager>(ConnectionManager);
    expect(connectionManager).toBeDefined();
    expect(connectionManager).toBeInstanceOf(ConnectionManager);
  });

  it('should have BitcoinCryptoUtilsService', () => {
    const cryptoUtilsService = module.get<BitcoinCryptoUtilsService>(BitcoinCryptoUtilsService);
    expect(cryptoUtilsService).toBeDefined();
    expect(cryptoUtilsService).toBeInstanceOf(BitcoinCryptoUtilsService);
  });

  it('should have BitcoinWebhookStreamService', () => {
    const webhookStreamService = module.get<BitcoinWebhookStreamService>(BitcoinWebhookStreamService);
    expect(webhookStreamService).toBeDefined();
    expect(webhookStreamService).toBeInstanceOf(BitcoinWebhookStreamService);
  });

  it('should have ProvidersConfig', () => {
    const providersConfig = module.get<ProvidersConfig>(ProvidersConfig);
    expect(providersConfig).toBeDefined();
    expect(providersConfig).toBeInstanceOf(ProvidersConfig);
  });

  // Add more tests for specific methods of the services if needed
});
