import { BitcoinIndexerBlockIndexedEventHandler } from './block-indexed.event-handler';
import { BitcoinIndexerBlockSuspendedEventHandler } from './block-suspended.event-handler';
import { BitcoinIndexerTransactionsBatchIndexedEventHandler } from './transactions-create-with-indexing.event-handler';

export const EventsHandlers = [
  BitcoinIndexerBlockIndexedEventHandler,
  BitcoinIndexerBlockSuspendedEventHandler,
  BitcoinIndexerTransactionsBatchIndexedEventHandler,
];
