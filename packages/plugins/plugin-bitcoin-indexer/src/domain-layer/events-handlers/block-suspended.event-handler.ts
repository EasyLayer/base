import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Transactional } from '@easylayer/core/read-database';
import { BitcoinIndexerBlockSuspendedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerBlockSuspendedEvent)
export class BitcoinIndexerBlockSuspendedEventHandler implements IEventHandler<BitcoinIndexerBlockSuspendedEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly blocksService: BlocksReadService
  ) {}

  @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinIndexerBlockSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId } = payload;

      // TODO: change field 'status' from string to booelan
      await this.blocksService.updateWithBuilder({ hash: aggregateId }, { status: 'suspended' });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
