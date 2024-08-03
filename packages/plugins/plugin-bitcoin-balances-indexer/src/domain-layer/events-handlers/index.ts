import { BitcoinBalancesIndexerTransactionsBatchIndexedEventHandler } from './transactions-batch-indexed.event-handler';
import { BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler } from './transactions-batch-suspended.event-handler';

export const EventsHandlers = [
  BitcoinBalancesIndexerTransactionsBatchIndexedEventHandler,
  BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler,
];
