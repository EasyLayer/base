import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { Transactional } from '@easylayer/read-database';
import { BitcoinBalancesIndexerTransactionsBatchSuspendedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionsBatchSuspendedEvent)
export class BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionsBatchSuspendedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly outputsReadService: OutputsReadService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  async handle({ payload }: BitcoinBalancesIndexerTransactionsBatchSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { batch } = payload;
      const { tx } = batch;

      const txids = Array.from(tx.keys());

      // NOTE: At the moment we do not delete reorganized outputs, but flag outputs as suspended
      await this.outputsReadService.updateWithBuilder({ txid: txids }, { is_suspended: true });
    } catch (error) {
      this.log.error('handle()', { error }, this.constructor.name);
      throw error;
    }
  }
}
