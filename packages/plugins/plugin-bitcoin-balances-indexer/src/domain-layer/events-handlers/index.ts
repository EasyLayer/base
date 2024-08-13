import { BitcoinBalancesIndexerBlocksAddedEventHandler } from './blocks-indexed.event-handler';
import { BitcoinBalancesIndexerInitializedEventHandler } from './indexer-initialized.event-handler';
import { BitcoinBalancesIndexerReorganisationProcessedEventHandler } from './reorganisation-processed.event-handler';

export const EventsHandlers = [
  BitcoinBalancesIndexerBlocksAddedEventHandler,
  BitcoinBalancesIndexerInitializedEventHandler,
  BitcoinBalancesIndexerReorganisationProcessedEventHandler,
];
