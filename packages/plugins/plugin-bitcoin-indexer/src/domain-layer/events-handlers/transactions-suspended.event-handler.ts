import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/logger';
import { Transactional } from '@easylayer/read-database';
import { BitcoinIndexerTransactionsBatchSuspendedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { TransactionsReadService } from '../services';

@EventsHandler(BitcoinIndexerTransactionsBatchSuspendedEvent)
export class BitcoinIndexerTransactionsBatchSuspendedEventhandler
  implements IEventHandler<BitcoinIndexerTransactionsBatchSuspendedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly transactionsService: TransactionsReadService
  ) {}

  @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ label: 'read update', showMemory: true })
  async handle({ payload }: BitcoinIndexerTransactionsBatchSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { batch } = payload;

      // Collect all txid from batch
      const txids: string[] = [];

      batch.tx.forEach((tx: any, txid: string) => {
        txids.push(txid);
      });

      // Update the status of all transactions with one query
      // await this.transactionsService.updateManyByTxIds(txids, status);
      // TODO: change status from string to boolean
      await this.transactionsService.updateWithBuilder({ txid: txids }, { status: 'suspended' });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
