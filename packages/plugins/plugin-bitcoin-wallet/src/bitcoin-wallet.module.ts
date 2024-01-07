import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { BitcoinWalletController } from './bitcoin-wallet.controller';
import { BitcoinWalletService } from './bitcoin-wallet.service';
import { AppConfig } from './config';

@Module({})
export class BitcoinWalletModule {
  static register(): DynamicModule {
    return {
      module: BitcoinWalletModule,
      imports: [],
      controllers: [BitcoinWalletController],
      providers: [
        BitcoinWalletService,
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env),
        },
      ],
      exports: [BitcoinWalletService],
    };
  }
}
