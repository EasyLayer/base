import { CreateBitcoinTransactionsPoolCommandHandler } from './create-bitcoin-transactions-pool.command-handler';
import { IndexBitcoinTransactionsBatchCommandHandler } from '../../../domain-layer/command-handlers/index-transactions-batch.command-handler';

export const TransactionsCommandHandlers = [
  CreateBitcoinTransactionsPoolCommandHandler,
  IndexBitcoinTransactionsBatchCommandHandler,
];
