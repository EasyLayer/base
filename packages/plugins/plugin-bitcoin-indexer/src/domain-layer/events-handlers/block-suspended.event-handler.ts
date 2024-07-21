import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinIndexerBlockSuspendedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerBlockSuspendedEvent)
export class BitcoinIndexerBlockSuspendedEventHandler implements IEventHandler<BitcoinIndexerBlockSuspendedEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly blocksService: BlocksReadService
  ) {}

  // Add transactions
  async handle({ payload }: BitcoinIndexerBlockSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, status } = payload;

      await this.blocksService.updateWithBuilder({ hash: aggregateId }, { status });
    } catch (error) {
      this.log.error('handle()', { error }, this.constructor.name);
      throw error;
    }
  }
}
