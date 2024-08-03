import { IndexBlockCommandHandler } from './index-block.command-handler';
import { InitIndexerCommandHandler } from './init-indexer.command-handler';
import { ProcessReorganisationCommandHandler } from './process-reorganisation.command-handler';

export const CommandHandlers = [
  IndexBlockCommandHandler,
  InitIndexerCommandHandler,
  ProcessReorganisationCommandHandler,
];
