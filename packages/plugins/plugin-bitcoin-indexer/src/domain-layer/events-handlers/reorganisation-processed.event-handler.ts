import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BitcoinIndexerReorganisationProcessedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { BlocksReadService } from '../services';

@EventsHandler(BitcoinIndexerReorganisationProcessedEvent)
export class BitcoinIndexerReorganisationProcessedEventHandler
  implements IEventHandler<BitcoinIndexerReorganisationProcessedEvent>
{
  constructor(private readonly blocksReadService: BlocksReadService) {}

  @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ showMemory: false })
  async handle({ payload }: BitcoinIndexerReorganisationProcessedEvent) {
    try {
      const { blocks } = payload;

      const blocksHashes: string[] = [];
      const txids: string[] = [];

      blocks.forEach((block: any) => {
        const { tx, hash } = block;
        if (Array.isArray(tx)) {
          tx.forEach((t) => txids.push(t));
        }

        blocksHashes.push(hash);
      });

      // NOTE: At the moment we do not delete reorganized blocks, but flag its as suspended
      await this.blocksReadService.updateWithBuilder({ hash: blocksHashes }, { is_suspended: true });
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
