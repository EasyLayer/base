import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { BitcoinParserController } from './bitcoin-parser.controller';
import { BitcoinParserService } from './bitcoin-parser.service';
import { AppConfig } from './config';
import { BitcoinParserCommandFactoryService } from './application-layer/services';
import { BitcoinBlockModelFactoryService } from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';

@Module({})
export class BitcoinParserModule {
  // private commandFactory!: BitcoinParserCommandFactoryService;

  static register(): DynamicModule {
    return {
      module: BitcoinParserModule,
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinParserModule' })],
      controllers: [BitcoinParserController],
      providers: [
        BitcoinParserService,
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env),
        },
        BitcoinParserCommandFactoryService,
        BitcoinBlockModelFactoryService,
        ...CommandHandlers,
      ],
      exports: [BitcoinParserService],
    };
  }
}
