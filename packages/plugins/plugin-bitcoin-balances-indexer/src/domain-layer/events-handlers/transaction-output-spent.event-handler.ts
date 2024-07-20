import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinBalancesIndexerTransactionOutputSpentEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionOutputSpentEvent)
export class BitcoinBalancesIndexerTransactionOutputSpentEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionOutputSpentEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly service: OutputsReadService
  ) {}

  async handle({ payload }: BitcoinBalancesIndexerTransactionOutputSpentEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      // const { aggregateId, voutIndex } = payload;

      // return await this.service.update({ txid: aggregateId, voutIndex }, { isSpent: true });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
