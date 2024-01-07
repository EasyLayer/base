import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { BitcoinParserController } from './bitcoin-parser.controller';
import { BitcoinParserService } from './bitcoin-parser.service';
import { AppConfig } from './config';

@Module({})
export class BitcoinParserModule {
  static register(): DynamicModule {
    return {
      module: BitcoinParserModule,
      imports: [],
      controllers: [BitcoinParserController],
      providers: [
        BitcoinParserService,
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env),
        },
      ],
      exports: [BitcoinParserService],
    };
  }
}
