import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/logger';
// import { Transactional } from '@easylayer/read-database';
import { BitcoinIndexerBlockIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerBlockIndexedEvent)
export class BitcoinIndexerBlockIndexedEventHandler implements IEventHandler<BitcoinIndexerBlockIndexedEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly service: BlocksReadService
  ) {}

  // @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ label: 'read update', showMemory: true })
  async handle({ payload }: BitcoinIndexerBlockIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { block } = payload;

      // await this.service.create({
      //   hash: block.hash,
      //   status,
      //   height: block.height,
      // previousblockhash:
      //   block.previousblockhash === '0000000000000000000000000000000000000000000000000000000000000000'
      //     ? null
      //     : block.previousblockhash,
      // });
      await this.service.create({
        block,
      });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
