import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { IndexBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { WalletsBatch } from '../models/wallets-batch.model';
import { Wallet, createWalletBalances } from '../models/wallet.model';
import { BalancesIndexer } from '../models/balances-indexer.model';
import {
  WalletsBatchModelFactoryService,
  BalancesIndexerModelFactoryService,
  WalletModelFactoryService
} from '../services';


@CommandHandler(IndexBalancesCommand)
export class IndexBalancesCommandHandler
  implements ICommandHandler<IndexBalancesCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly walletsBatchModelFactory: WalletsBatchModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly eventStore: EventStoreRepository,
    private readonly walletModelFactory: WalletModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: IndexBalancesCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { batch, blockHash, blockHeight, requestId } = payload;
      const { transactions, index, isFinalBatch } = batch;

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Check Reorganisation / Synchronisation */
      if (!indexerModel.chain.validateNextBatch(batch, blockHash, blockHeight)) {
        await indexerModel.updateChain({ batch, blockHash, blockHeight, requestId });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        return;
      }

      /* Index Balances */
      const wallets: Wallet[] = [];

      const walletsBalances = createWalletBalances(transactions);

      for (const [publicKey, balances] of walletsBalances) {
        const wallet: Wallet = this.walletModelFactory.createNewModel();
        await wallet.add({ aggregateId: publicKey, requestId, balances });
        wallets.push(wallet);
      }

      const walletsBatch: WalletsBatch = this.walletsBatchModelFactory.createNewModel();
      // NOTE: генерируем новый aggregateId 
      // TODO: может сделать тем же самым что и transactionBatch - нет, 
      // потому что в кейсе когда мы не рабоатем с индексером у нас нет айди конкретных батчей
      await walletsBatch.index({ aggregateId: uuidv4(), requestId, wallets });
      await indexerModel.addBatch({ batch, blockHash, blockHeight, requestId });

      await this.eventStore.save([indexerModel, walletsBatch, ...wallets]);

      for (let wallet of wallets) {
        // Мы сохранили события в базу но не публикуем их все, а публикуем только walletsBatch
        // Может и не нужно явно вызывать этот метод. 
        wallet.uncommit();
      }

      await indexerModel.commit();
      await walletsBatch.commit();

      this.log.debug(`Wallets Batch successfull indexed`, { batches: walletsBatch }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}