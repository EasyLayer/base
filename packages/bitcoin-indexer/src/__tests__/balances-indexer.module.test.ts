import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinBalancesIndexerModule } from '../bitcoin-balances-indexer.module';

describe('BitcoinBalancesIndexerModule', () => {
  let bitcoinBalancesIndexerModule: BitcoinBalancesIndexerModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BitcoinBalancesIndexerModule],
    }).compile();

    bitcoinBalancesIndexerModule = module.get<BitcoinBalancesIndexerModule>(BitcoinBalancesIndexerModule);
  });

  it('should be defined', () => {
    expect(bitcoinBalancesIndexerModule).toBeDefined();
  });
});
