import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore';
import { EventStoreRepository } from '@easylayer/eventstore';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { IndexTransactionsCommand } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { AppLogger } from '@easylayer/logger';
import { BalancesIndexer } from '../models/balances-indexer.model';
import { Transaction } from '../models/transaction.model';
import { TransactionModelFactoryService, BalancesIndexerModelFactoryService } from '../services';

@CommandHandler(IndexTransactionsCommand)
export class IndexTransactionsCommandHandler implements ICommandHandler<IndexTransactionsCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly transactionModelFactory: TransactionModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: IndexTransactionsCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      // NOTE: batch - is from TransactionsQueue
      const { batch, requestId } = payload;
      const { blockHeight, blockHash, ...restBatch } = batch;
      const { tx } = restBatch;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Check Reorganisation */
      if (!indexerModel.chain.validateNextBatch(batch)) {
        await indexerModel.startReorganisation({
          height: blockHeight,
          requestId,
          service: this.networkProviderService,
        });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        return;
      }

      const transactionModels: Transaction[] = [];

      // СДЕЛАТЬ ТУТ ИНДЕКСАЦИЮ ОДНОГО БАТЧА!!!!!
      // А НЕ ОТДЕЛЬНЫХ ТРАНЗАКЦИЙ

      // А ТАЖЕ ПЕРЕДЕЛАТЬ СТРУКТУРУ АГРЕГАТА ИНДЕКСЕТОРА

      for (const t of tx) {
        const { txid, vin, vout } = t;

        // Create new outputs that we received in the transaction.
        // IMPORTANT: We trust that the network itself has checked the validity of the outputs
        // and we only keep them in their state.
        const newTxModel: Transaction = this.transactionModelFactory.createNewModel();
        await newTxModel.index({ aggregateId: txid, vout, vin, requestId, blockHeight, blockHash });
        transactionModels.push(newTxModel);

        // // Update the old output knowing it through the input
        // // IMPORTANT: There can be many inputs and they can be from different transactions,
        // // so we create a new transaction aggregate for each input and spend it
        // for (const input of vin) {
        //   // В теории мы можем тут достать все аггрегаты где есть выходы эти и потратить их.
        //   // По сути мы достаем тут только один аггрегат, но нам нужно тогда все сразу тут доставать, где то выше.
        //   // НО А НАМ ТОЧНО ЭТО НУЖНО??
        //   const oldTxModel: Transaction = this.transactionModelFactory.createNewModel();
        //   const voutIndex = input.vout ? input.vout : -1; // -1 mean coinbase tx
        //   await oldTxModel.spend({ aggregateId: input.txid, voutIndex, requestId });
        //   transactionModels.push(oldTxModel);
        // }
      }

      await indexerModel.addTransactionsBatch({ batch, requestId });

      await this.eventStore.save([...transactionModels, indexerModel]);

      for (const t of transactionModels) {
        await t.commit();
      }

      await indexerModel.commit();

      this.log.info('Transactions successfull indexed', { txCount: transactionModels.length }, this.constructor.name);
      this.log.debug('Transactions successfull indexed', { txCount: transactionModels.length }, this.constructor.name);
    } catch (error) {
      console.log(error);
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
