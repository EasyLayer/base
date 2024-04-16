import { Module } from '@nestjs/common';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { BitcoinBlocksService } from './blocks.service';
import { BitcoinBlocksCommandFactoryService, BitcoinNetworkCommandFactoryService } from './application-layer/services';
import { BitcoinBlockModelFactoryService, BitcoinNetworkModelFactoryService } from './domain-layer/services';
import { BlocksCommandHandlers } from './domain-layer/command-handlers';

@Module({
  controllers: [],
  imports: [LoggerModule.forRoot({ componentName: 'BitcoinBlocksModule' })],
  providers: [
    BitcoinBlocksService,
    ArithmeticService,
    BitcoinBlocksCommandFactoryService,
    BitcoinBlockModelFactoryService,
    BitcoinNetworkModelFactoryService,
    BitcoinNetworkCommandFactoryService,
    ...BlocksCommandHandlers,
  ],
  exports: [BitcoinBlocksService],
})
export class BitcoinBlocksModule {}
