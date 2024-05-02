import { Module } from '@nestjs/common';
import { LoggerModule } from '@easylayer/logger';
import { EventStoreModule } from '@easylayer/eventstore';
import { ArithmeticService } from '@easylayer/arithmetic';
import { BitcoinBlocksService } from './blocks.service';
import { BitcoinBlocksCommandFactoryService, BitcoinNetworkCommandFactoryService } from '../application-layer/services';
import { BitcoinBlockModelFactoryService, BitcoinNetworkModelFactoryService } from '../domain-layer/services';
import { BlocksCommandHandlers } from '../domain-layer/command-handlers';

@Module({
  controllers: [],
  imports: [
    LoggerModule.forRoot({ componentName: 'BitcoinBlocksModule' }),

    // TODO: move condigs into envs
    EventStoreModule.forRoot({
      type: 'sqlite',
      name: 'blocks-write',
      database: '',
      synchronize: true,
      logging: true,
      enableWAL: true,
      // Now, when attempting to perform an operation that encountered a block,
      // SQLite will attempt to retry the operation for the specified time before returning an error. 
      // busyTimeout: 1000
    }),
  ],
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
