import { BitcoinBalancesIndexerTransactionIndexedEventHandler } from './transaction-indexed.event-handler';
import { BitcoinBalancesIndexerTransactionOutputSpentEventHandler } from './transaction-output-spent.event-handler';
import { BitcoinBalancesIndexerTransactionOutputUnspentEventHandler } from './transaction-output-unspent.event-handler';
import { BitcoinBalancesIndexerTransactionDeletedEventHandler } from './transaction-deleted.event-handler';

export const EventsHandlers = [
  BitcoinBalancesIndexerTransactionIndexedEventHandler,
  BitcoinBalancesIndexerTransactionOutputSpentEventHandler,
  BitcoinBalancesIndexerTransactionOutputUnspentEventHandler,
  BitcoinBalancesIndexerTransactionDeletedEventHandler,
];
