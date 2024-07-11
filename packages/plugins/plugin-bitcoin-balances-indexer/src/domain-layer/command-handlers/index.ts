import { InitIndexerCommandHandler } from './init-indexer.command-handler';
import { IndexTransactionsCommandHandler } from './index-transactions.command-handler';
import { ProcessReorganisationCommandHandler } from './process-reorganisation.command-handler';

export const CommandHandlers = [
  InitIndexerCommandHandler,
  IndexTransactionsCommandHandler,
  ProcessReorganisationCommandHandler,
];
