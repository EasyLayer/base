import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinParserModule } from '../bitcoin-parser.module';

describe('Bitcoinparser', () => {
  let bitcoinParserModule: BitcoinParserModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BitcoinParserModule],
    }).compile();

    bitcoinParserModule = module.get<BitcoinParserModule>(BitcoinParserModule);
  });

  it('should be defined', () => {
    expect(bitcoinParserModule).toBeDefined();
  });
});
