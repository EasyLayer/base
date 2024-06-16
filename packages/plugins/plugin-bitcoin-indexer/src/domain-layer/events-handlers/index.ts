import { BlockWithCompleteIndexedEventHandler } from './block-with-complete-indexed.event-handler';
import { IndexerReorganisationEventHandler } from './indexer-reorganisation.event-handler';
import { TransactionsBatchWithIndexCreatedEventHandler } from './transactions-create-with-indexing.event-handler';

export const EventsHandlers = [
  BlockWithCompleteIndexedEventHandler,
  IndexerReorganisationEventHandler,
  TransactionsBatchWithIndexCreatedEventHandler,
];
