import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinBalancesIndexerTransactionIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionIndexedEvent)
export class BitcoinBalancesIndexerTransactionIndexedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionIndexedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly service: OutputsReadService
  ) {}

  async handle({ payload }: BitcoinBalancesIndexerTransactionIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, blockHeight, outputs } = payload;

      return await this.service.createMany({ txid: aggregateId, outputs, blockHeight });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
