import { BitcoinIndexerBlockWithCompleteIndexedEventHandler } from './block-with-complete-indexed.event-handler';
import { BitcoinIndexerBlockSuspendedEventHandler } from './block-suspended.event-handler';
import { BitcoinIndexerTransactionsBatchWithIndexCreatedEventHandler } from './transactions-create-with-indexing.event-handler';

export const EventsHandlers = [
  BitcoinIndexerBlockWithCompleteIndexedEventHandler,
  BitcoinIndexerBlockSuspendedEventHandler,
  BitcoinIndexerTransactionsBatchWithIndexCreatedEventHandler,
];
