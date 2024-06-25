import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderModule } from '../bitcoin-network-provider.module';

describe('BitcoinNetworkProviderModule', () => {
  let bitcoinNetworkProviderModule: BitcoinNetworkProviderModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BitcoinNetworkProviderModule],
    }).compile();

    bitcoinNetworkProviderModule = module.get<BitcoinNetworkProviderModule>(BitcoinNetworkProviderModule);
  });

  it('should be defined', () => {
    expect(bitcoinNetworkProviderModule).toBeDefined();
  });
});
