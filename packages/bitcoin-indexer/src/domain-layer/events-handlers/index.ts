import { BitcoinIndexerBlocksAddedEventHandler } from './blocks-indexed.event-handler';
import { BitcoinIndexerInitializedEventHandler } from './indexer-initialized.event-handler';
import { BitcoinIndexerReorganisationProcessedEventHandler } from './reorganisation-processed.event-handler';

export const EventsHandlers = [
  BitcoinIndexerBlocksAddedEventHandler,
  BitcoinIndexerInitializedEventHandler,
  BitcoinIndexerReorganisationProcessedEventHandler,
];
