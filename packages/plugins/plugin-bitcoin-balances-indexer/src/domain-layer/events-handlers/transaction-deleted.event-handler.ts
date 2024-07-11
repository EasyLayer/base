import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinBalancesIndexerTransactionDeletedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionDeletedEvent)
export class BitcoinBalancesIndexerTransactionDeletedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionDeletedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly service: OutputsReadService
  ) {}

  async handle({ payload }: BitcoinBalancesIndexerTransactionDeletedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, outputsIndexes } = payload;

      // NOTE: At the moment we do not delete reorganized outputs, but flag them as suspended
      return await this.service.suspend({ txid: aggregateId, outputsIndexes });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
    }
  }
}
