import { Module } from '@nestjs/common';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
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
  imports: [LoggerModule.forRoot({ componentName: 'BitcoinTransactionsModule' })],
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
