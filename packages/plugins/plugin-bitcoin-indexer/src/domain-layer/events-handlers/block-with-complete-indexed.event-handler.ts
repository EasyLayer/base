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

  // IMPORTANT: at this stage if this method would throw an error 
  // - we won't catch it! (the app should restart after that)
  async handle({ payload }: BitcoinBlockWithCompleteIndexedEvent) {
    try {
      this.log.debug('1handle()', payload, this.constructor.name);

      const { aggregateId, block, status, batches } = payload;

      // QUESTION: Is there another point where we can do something like view the previous block?
      // But we don't have access to the previous block? In theory, there is a height, but it’s not quite correct.
      // For what? - supposedly so that we understand that we can definitely update the units further

      return await this.service.create({ hash: block.hash, status });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
