import { IndexBlockCommandHandler } from './index-block.command-handler';
import { InitIndexerCommandHandler } from './init-indexer.command-handler';
import { IndexTransactionsBatchCommandHandler } from './index-transactions-batch.command-handler';

export const CommandHandlers = [
  IndexBlockCommandHandler,
  InitIndexerCommandHandler,
  IndexTransactionsBatchCommandHandler,
];
