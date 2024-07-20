import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
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

  async handle({ payload }: BitcoinIndexerTransactionsBatchSuspendedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { batch, status } = payload;

      // Collect all txid from batch
      const txids: string[] = [];
      batch.tx.forEach((tx: any, txid: string) => {
        txids.push(txid);
      });

      // Update the status of all transactions with one query
      await this.transactionsService.updateManyByTxIds(txids, status);
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
