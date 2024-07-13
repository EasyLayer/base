import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinIndexerBlockIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerBlockIndexedEvent)
export class BitcoinIndexerBlockIndexedEventHandler implements IEventHandler<BitcoinIndexerBlockIndexedEvent> {
  constructor(
    private readonly log: AppLogger,
    private readonly service: BlocksReadService
  ) {}

  // IMPORTANT: at this stage if this method would throw an error
  // - we won't catch it! (the app should restart after that)
  async handle({ payload }: BitcoinIndexerBlockIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { block, status } = payload;

      // QUESTION: Is there another point where we can do something like view the previous block?
      // But we don't have access to the previous block? In theory, there is a height, but it’s not quite correct.
      // For what? - supposedly so that we understand that we can definitely update the units further

      return await this.service.create({
        hash: block.hash,
        status,
        height: block.height,
        prevHash: block.prevHash,
      });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
