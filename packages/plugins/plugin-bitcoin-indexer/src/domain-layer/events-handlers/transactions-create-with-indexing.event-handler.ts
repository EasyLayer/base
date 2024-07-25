import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/logger';
import { Transactional } from '@easylayer/read-database';
import { BitcoinIndexerTransactionsBatchIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { TransactionsReadService } from '../services';

@EventsHandler(BitcoinIndexerTransactionsBatchIndexedEvent)
export class BitcoinIndexerTransactionsBatchIndexedEventHandler
  implements IEventHandler<BitcoinIndexerTransactionsBatchIndexedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly transactionsService: TransactionsReadService
  ) {}

  @Transactional({ connectionName: 'indexer-read' })
  @RuntimeTracker({ label: 'read update', showMemory: true })
  async handle({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { blockHash, batch } = payload;

      const processTransactions: any[] = [];

      batch.tx.forEach((item: any) => {
        processTransactions.push({
          txid: item.txid,
          vin: item.vin,
          vout: item.vout,
        });
      });

      return await this.transactionsService.createMany({ blockHash, transactions: processTransactions });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
