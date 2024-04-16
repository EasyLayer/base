import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { BitcoinWalletController } from './bitcoin-wallet.controller';
import { BitcoinWalletService } from './bitcoin-wallet.service';
import { AppConfig } from './config';
import { BitcoinWalletCommandFactoryService } from './application-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
import { BitcoinWalletModelFactoryService } from './domain-layer/services';

@Module({})
export class BitcoinWalletModule {
  static register(): DynamicModule {
    return {
      module: BitcoinWalletModule,
      imports: [LoggerModule.forRoot({ componentName: 'BitcoinWalletModule' })],
      controllers: [BitcoinWalletController],
      providers: [
        BitcoinWalletService,
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env),
        },
        BitcoinWalletCommandFactoryService,
        BitcoinWalletModelFactoryService,
        ...CommandHandlers,
      ],
      exports: [BitcoinWalletService],
    };
  }
}
