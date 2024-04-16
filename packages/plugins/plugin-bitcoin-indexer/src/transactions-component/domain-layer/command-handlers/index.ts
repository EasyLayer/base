import { CreateBitcoinTransactionsPoolCommandHandler } from './create-bitcoin-transactions-pool.command-handler';
import { IndexBitcoinTransactionsBatchCommandHandler } from './index-transactions-batch.command-handler';

export const TransactionsCommandHandlers = [
  CreateBitcoinTransactionsPoolCommandHandler,
  IndexBitcoinTransactionsBatchCommandHandler,
];
