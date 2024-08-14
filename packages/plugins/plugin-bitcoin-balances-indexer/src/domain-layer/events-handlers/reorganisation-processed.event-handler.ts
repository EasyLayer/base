import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BitcoinBalancesIndexerReorganisationProcessedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService } from '../services';

@EventsHandler(BitcoinBalancesIndexerReorganisationProcessedEvent)
export class BitcoinBalancesIndexerReorganisationProcessedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerReorganisationProcessedEvent>
{
  constructor(private readonly outputsReadService: OutputsReadService) {}

  @Transactional({ connectionName: process.env.BITCOIN_BALANCES_INDEXER_READ_DB_NAME })
  @RuntimeTracker({ showMemory: false })
  async handle({ payload }: BitcoinBalancesIndexerReorganisationProcessedEvent) {
    try {
      const { blocks } = payload;

      const txids: string[] = [];

      blocks.forEach((block: any) => {
        const { tx } = block;
        if (Array.isArray(tx)) {
          tx.forEach((t) => txids.push(t));
        }
      });

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
