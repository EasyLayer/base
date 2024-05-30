import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinWalletsBatchBalancesIndexedEvent,
  BitcoinWalletsBatchBalancesRolledbackEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';
import { Wallet, Balance } from './wallet.model';


// key - публичные ключи ? Или адреса? 
type Wallets = string[];

// В этом батче я уже посчитаю балансы для каждого кошелька тут
export class WalletsBatch extends AggregateRoot {
  public aggregateId!: string; // ??? может сделать тем же самым что и transactionBatch - нет, потому чт ов кейсе когда мы не рабоатем с индексером у нас нет айди конкретных батчей
  public wallets!: Wallets;
  public status!: string;

  public async index({
    aggregateId,
    requestId,
    balances
  }: {
    aggregateId: string;
    requestId: string;
    balances: Balance[];
  }) {
    this.aggregateId = aggregateId;
    await this.apply(new BitcoinWalletsBatchBalancesIndexedEvent({ aggregateId, requestId, balances, status: 'indexed' }));
  }

  public async rollback({
    aggregateId,
    requestId,
    wallets
  }: {
    aggregateId: string;
    requestId: string;
    wallets: Wallet[];
  }) {
    this.aggregateId = aggregateId;

    await this.apply(new BitcoinWalletsBatchBalancesRolledbackEvent({
      aggregateId,
      requestId,
      wallets: wallets.map(item => ({ aggregateId: item.aggregateId, addressBalances: item.addressBalances })), // Нужно ли это серилизовать? 
      status: 'suspended'
    }));
  }

  private onBitcoinWalletsBatchBalancesIndexedEvent({ payload }: BitcoinWalletsBatchBalancesIndexedEvent) {
    const { aggregateId, balances, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
    this.wallets = Object.keys(balances);
  }

  private onBitcoinWalletsBatchBalancesRolledbackEvent({ payload }: BitcoinWalletsBatchBalancesRolledbackEvent) {
    const { aggregateId, status } = payload;
    // IMPORTANT: так как мы хотим событием перезаписать эти данные, то мы и сетим aggregtaeId повторно
    this.aggregateId = aggregateId;
    this.status = status;

    // А что мы ролбечем? Ну мы точно хотим откатить кошелкьи 
    // Но по идеи и так ничего не нужно, только статус обнвоить и все. 
  }
}



