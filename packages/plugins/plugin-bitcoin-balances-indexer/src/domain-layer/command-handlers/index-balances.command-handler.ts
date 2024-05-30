import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { EventStoreRepository } from '@easylayer/eventstore';
import { IndexBalancesCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import { WalletsBatch, Balance, Rune, NFT, NativeCoin, OutputTypes } from '../models/wallets-batch.model';
import { Wallet } from '../models/wallet.model';
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

      transactions.forEach((transaction: any) => {
        const wallet: Wallet = this.walletModelFactory.createNewModel();

        const newBalances = this.createBalancesFromTransaction(transaction);
        if (newBalances) {
          balances.push(...newBalances);
        }

        await wallet.add({ aggregateId: '', requestId });
      });

      await indexerModel.addBatch({ batch, blockHash, blockHeight, requestId });

      const walletsBatch: WalletsBatch = this.walletsBatchModelFactory.createNewModel();
      await walletsBatch.index({ aggregateId: uuidv4(), requestId, balances });

      await this.eventStore.save([indexerModel, walletsBatch, wallets]);

      // for (let wallet of wallets) 
        // Мы сохранили события в базу но не публикуем их все, а публикуем только walletsBatch
      // Может и не нужно явно вызывать этот метод. 
        // await wallet.uncommit();
      // }
      await indexerModel.commit();
      await walletsBatch.commit();

      this.log.debug(`Wallets Batch successfull indexed`, { batches: walletsBatch }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }

  // TODO: Вынести в Провайдер
  private createBalancesFromTransaction(transaction: any): Balance[] {
    const balances: Balance[] = [];
  
    // Создаем отрицательные балансы для входов (vin)
    transaction.vin.forEach((input: any) => {
      const transactionType = this.determineTransactionType(input);
      if (transactionType) {
        const balance = this.createBalanceFromInput(transactionType, input);
        if (balance) {
          balances.push(balance);
        }
      }
    });
  
    // Создаем положительные балансы для выходов (vout)
    transaction.vout.forEach((output: any) => {
      const transactionType = this.determineTransactionType(output);
      if (transactionType) {
        const balance = this.createBalanceFromOutput(transactionType, output);
        if (balance) {
          balances.push(balance);
        }
      }
    });
  
    return balances;
  }

  // TODO: Вынести в Провайдер
  private createBalanceFromOutput(type: OutputTypes, output: any): Balance | undefined {
    switch (type) {
      case OutputTypes.NATIVE:
        return new NativeCoin(output.publicKey, output.address, BigInt(output.amount));
      case OutputTypes.NFT:
        return new NFT(output.publicKey, output.address, output.name, output.metadata);
      case OutputTypes.RUNE:
        return new Rune(output.publicKey, output.address, output.type, output.value);
      default:
        return undefined;
    }
  }

  // TODO: Вынести в Провайдер
  private createBalanceFromInput(type: OutputTypes, input: any): Balance | undefined {
    switch (type) {
      case OutputTypes.NATIVE:
        return new NativeCoin(input.publicKey, input.address, -BigInt(input.amount));
      case OutputTypes.NFT:
        return new NFT(input.publicKey, input.address, input.name, input.metadata, true);
      case OutputTypes.RUNE:
        return new Rune(input.publicKey, input.address, input.type, -input.value);
      default:
        return undefined;
    }
  }

  // TODO: move to Provider package
  private determineTransactionType(outputs: any[]): OutputTypes | undefined {
    if (outputs.some(output => output.tokenType === 'rune')) {
      return OutputTypes.RUNE;
    } else if (outputs.some(output => output.contractAddress && output.tokenId)) {
      return OutputTypes.NFT;
    } else if (outputs.some(output => output.amount && output.address)) {
      return OutputTypes.NATIVE;
    }
    return undefined;
  }
}