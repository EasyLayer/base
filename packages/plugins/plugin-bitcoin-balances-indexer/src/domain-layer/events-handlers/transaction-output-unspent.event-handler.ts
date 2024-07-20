import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { BitcoinBalancesIndexerTransactionOutputUnspentEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionOutputUnspentEvent)
export class BitcoinBalancesIndexerTransactionOutputUnspentEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionOutputUnspentEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly service: OutputsReadService
  ) {}

  async handle({ payload }: BitcoinBalancesIndexerTransactionOutputUnspentEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      // const { aggregateId, voutIndex } = payload;

      // return await this.service.update({ txid: aggregateId, voutIndex }, { isSpent: false });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
