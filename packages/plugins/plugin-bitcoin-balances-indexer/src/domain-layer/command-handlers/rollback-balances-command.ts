// import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { RollbackBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { WalletsBatch } from '../models/wallets-batch.model';
import { Wallet, createWalletBalances } from '../models/wallet.model';
import { BalancesIndexer } from '../models/balances-indexer.model';
import {
  WalletsBatchModelFactoryService,
  BalancesIndexerModelFactoryService,
  WalletModelFactoryService
} from '../services';

@CommandHandler(RollbackBalancesCommand)
export class RollbackBalancesCommandHandler
  implements ICommandHandler<RollbackBalancesCommand>
{
  constructor(
    private readonly log: AppLogger,
    private readonly walletsBatchModelFactory: WalletsBatchModelFactoryService,
    private readonly balancesIndexerModelFactory: BalancesIndexerModelFactoryService,
    private readonly eventStore: EventStoreRepository,
    private readonly walletModelFactory: WalletModelFactoryService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-write' })
  async execute({ payload }: RollbackBalancesCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { batches, requestId, blockHash, blockHeight, reorganisationHeight } = payload;
      // reorganisationHeight - это высота реорганизации. Нам пришел батч с высотой которая у нас уже была
      // и в конечно итоге мы хотим откатить все батчи что стоят после этой высоты в нашей стурктуре
      // Поэтому мы будем передавать одну и туже высоту пока не откатиим до нее все батчи. 
      // Проверять будем в этой комманде, как проверять? - берем batches , смотрим самый первый элемент (самый старый)
      // и смотрим если там высота = - reorganisationHeight то значит норм можно завершать. 

      // TODO: Indexer should be in snapshot cache
      const indexerModel: BalancesIndexer = await this.balancesIndexerModelFactory.initModel();

      this.log.debug('Init Balances Indexer model', { aggregateId: indexerModel.aggregateId }, this.constructor.name);

      /* Confirm Reorganisation */
      if (blockHeight < reorganisationHeight) {
        await indexerModel.confirmReorganisation({ reorganisationHeight, requestId });
        await this.eventStore.save(indexerModel);
        await indexerModel.commit();
        this.log.debug(`Balances Indexer reorganisation confirmed`, {}, this.constructor.name);
        return;
      }

      /* Rollback balances */
      const walletsBatches: WalletsBatch[] = [];

      for (let batch of batches) {
        const { aggregateId, transactions } = batch;

        const wallets: Wallet[] = [];

        const walletsBalances = createWalletBalances(transactions, true);

        for (const [publicKey, balances] of walletsBalances) {
          const wallet: Wallet = this.walletModelFactory.createNewModel();
          await wallet.add({ aggregateId: publicKey, requestId, balances });
          wallets.push(wallet);
        }

        const batchModel: WalletsBatch = this.walletsBatchModelFactory.createNewModel();
        await batchModel.rollback({ aggregateId, requestId, wallets });

        walletsBatches.push(batchModel);

        await this.eventStore.save([...wallets]);

        for (let wallet of wallets) {
          wallet.uncommit();
        }
      }

      await indexerModel.reorganisation({ reorganisationHeight, requestId });

      await this.eventStore.save([...walletsBatches, indexerModel]);

      for (let batch of walletsBatches)  {
        await batch.commit();
      }

      await indexerModel.commit();

      this.log.debug(`Wallets Batches successfull indexed`, { batches: walletsBatches }, this.constructor.name);

    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}