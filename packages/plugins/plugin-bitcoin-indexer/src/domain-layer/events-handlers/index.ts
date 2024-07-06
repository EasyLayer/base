import { BitcoinIndexerBlockWithCompleteIndexedEventHandler } from './block-with-complete-indexed.event-handler';
import { IndexerReorganisationEventHandler } from './indexer-reorganisation.event-handler';
import { BitcoinIndexerTransactionsBatchWithIndexCreatedEventHandler } from './transactions-create-with-indexing.event-handler';

export const EventsHandlers = [
  BitcoinIndexerBlockWithCompleteIndexedEventHandler,
  IndexerReorganisationEventHandler,
  BitcoinIndexerTransactionsBatchWithIndexCreatedEventHandler,
];
