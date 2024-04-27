import { Module } from '@nestjs/common';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
import { BitcoinTransactionsService } from './transactions.service';
import { BitcoinTransactionsCommandFactoryService } from './application-layer/services';
import {
  BitcoinTransactionModelFactoryService,
  BitcoinTransactionsBatchModelFactoryService,
  BitcoinTransactionsPoolModelFactoryService,
} from './domain-layer/services';
import { TransactionsCommandHandlers } from './domain-layer/command-handlers';

@Module({
  controllers: [],
  imports: [
    LoggerModule.forRoot({ componentName: 'BitcoinTransactionsModule' }),
    EventStoreModule.forRoot({
      type: 'sqlite',
      name: 'transactions-write',
      // database: '',
      synchronize: true,
      logging: true,
      enableWAL: true,
      // Now, when attempting to perform an operation that encountered a block,
      // SQLite will attempt to retry the operation for the specified time before returning an error. 
      // busyTimeout: 1000
    }),
  ],
  providers: [
    BitcoinTransactionsService,
    ArithmeticService,
    BitcoinTransactionModelFactoryService,
    BitcoinTransactionsCommandFactoryService,
    BitcoinTransactionsBatchModelFactoryService,
    BitcoinTransactionsPoolModelFactoryService,
    ...TransactionsCommandHandlers,
  ],
  exports: [BitcoinTransactionsService],
})
export class BitcoinTransactionsModule {}
