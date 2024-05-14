import { IndexBlockCommandHandler } from './index-block.command-handler';
import { InitNetworkCommandHandler } from './init-network.command-handler';
import { IndexTransactionsBatchCommandHandler } from './index-transactions-batch.command-handler';

export const CommandHandlers = [
    IndexBlockCommandHandler,
    InitNetworkCommandHandler,
    IndexTransactionsBatchCommandHandler
];
