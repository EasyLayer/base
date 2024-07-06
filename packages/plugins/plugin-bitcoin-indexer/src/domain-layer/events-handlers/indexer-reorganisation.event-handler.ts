import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinIndexerReorganisationEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerReorganisationEvent)
export class IndexerReorganisationEventHandler implements IEventHandler<BitcoinIndexerReorganisationEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly service: BlocksReadService
  ) {}

  // TODO: think if we need here a try catch ?
  async handle({ payload }: BitcoinIndexerReorganisationEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, blocksHashes } = payload;

      this.log.info('Aggregete Id Handle: ', { aggregateId, blocksHashes }, this.constructor.name);

      // достаем по хэшам все блоки и меняем им статус на suspended

      //   return await this.service.update({ id: aggregateId, hash: block.hash });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
