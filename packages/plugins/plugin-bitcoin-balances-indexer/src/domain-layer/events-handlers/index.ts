import { BitcoinBalancesIndexerBlocksAddedEventHandler } from './blocks-indexed.event-handler';
// import { BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler } from './transactions-batch-suspended.event-handler';
import { BitcoinBalancesIndexerInitializedEventHandler } from './indexer-initialized.event-handler';

export const EventsHandlers = [
  BitcoinBalancesIndexerBlocksAddedEventHandler,
  BitcoinBalancesIndexerInitializedEventHandler,
  // BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler,
];
