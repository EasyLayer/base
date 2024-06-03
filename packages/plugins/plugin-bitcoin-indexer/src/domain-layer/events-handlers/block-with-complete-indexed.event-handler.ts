import { EventsHandler , IEventHandler} from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinBlockWithCompleteIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinBlockWithCompleteIndexedEvent)
export class BlockWithCompleteIndexedEventHandler
  implements IEventHandler<BitcoinBlockWithCompleteIndexedEvent> {
    constructor(
      private readonly log: AppLogger,
      private readonly service: BlocksReadService,
    ) {}

  // TODO: think if we need here a try catch ?
  async handle({ payload }: BitcoinBlockWithCompleteIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, block, status } = payload;

      this.log.info('Aggregete Id Handle: ', { aggregateId, block, status }, this.constructor.name);

      return await this.service.create({ id: aggregateId, hash: block.hash, status });
    } catch(error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
