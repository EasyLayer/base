import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinIndexerBlockSuspendedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService, TransactionsReadService } from '../services';

@EventsHandler(BitcoinIndexerBlockSuspendedEvent)
export class BitcoinIndexerBlockSuspendedEventHandler implements IEventHandler<BitcoinIndexerBlockSuspendedEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly blocksService: BlocksReadService,
    private readonly transactionsService: TransactionsReadService
  ) {}

  // Add transactions
  async handle({ payload }: BitcoinIndexerBlockSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId } = payload;

      // NOTE: If there is a transactional problem,
      // then we can publish blocks and batches separately and will change them separately for each.
      await this.blocksService.update({ hash: aggregateId }, { status: 'suspended' });
      await this.transactionsService.update({ txid: aggregateId }, { status: 'suspended' });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
