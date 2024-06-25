import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinTransactionsBatchWithIndexCreatedEvent } from '@easylayer/domain-cqrs-components/bitcoin';
import { BlocksReadService, TransactionsReadService } from '../services';

@EventsHandler(BitcoinTransactionsBatchWithIndexCreatedEvent)
export class TransactionsBatchWithIndexCreatedEventHandler
  implements IEventHandler<BitcoinTransactionsBatchWithIndexCreatedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly blocksService: BlocksReadService,
    private readonly transactionsService: TransactionsReadService
  ) {}

  // IMPORTANT: at this stage if this method would throw an error
  // - we won't catch it! (the app should restart after that)
  async handle({ payload }: BitcoinTransactionsBatchWithIndexCreatedEvent) {
    try {
      this.log.debug('2handle()', payload, this.constructor.name);

      const { blockHash, status, batch } = payload;

      // Check if block exists
      const block = await this.blocksService.findOne({
        where: { hash: blockHash },
        // relations: ['transactions']
      });
      if (!block) {
        throw new Error('Block is not found');
      }

      return await this.transactionsService.createMany({ block, batch, status });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
