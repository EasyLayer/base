import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BitcoinBalancesIndexerTransactionsBatchSuspendedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

// TODO: refactor this class

@EventsHandler(BitcoinBalancesIndexerTransactionsBatchSuspendedEvent)
export class BitcoinBalancesIndexerTransactionsBatchSuspendedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionsBatchSuspendedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly outputsReadService: OutputsReadService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinBalancesIndexerTransactionsBatchSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { batch } = payload;
      const { tx } = batch;

      const txids = Array.from(tx.keys());

      // NOTE: At the moment we do not delete reorganized outputs, but flag outputs as suspended
      await this.outputsReadService.updateWithBuilder({ txid: txids }, { is_suspended: true });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError;
        if (driverError.code === 'SQLITE_CONSTRAINT') {
          throw new Error(driverError.message);
        }
        if (driverError.code === '23505') {
          throw new Error(driverError.detail);
        }
      }

      throw error;
    }
  }
}
