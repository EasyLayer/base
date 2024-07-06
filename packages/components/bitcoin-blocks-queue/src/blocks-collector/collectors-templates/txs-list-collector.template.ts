import { Block, Transaction, TransctionsList } from '../../interfaces';
import { BaseCollector } from './base-collector.template';

export class TransactionsListCollector extends BaseCollector {
  private transactions: Transaction[] = [];

  public add({ hash, height }: Block, data: TransctionsList): boolean {
    // Проверяем, что в данных высота блока и хэш относятся к этому блоку
    if (data.blockHash !== hash || data.blockHeight !== height) {
      return false;
    }

    this.transactions.push(...data.transactions);
    this._receivedTransactionCount += data.transactions.length;

    return true;
  }

  public collectAllTransactions(): Transaction[] {
    return this.transactions;
  }

  public reset(): void {
    this.transactions = [];
    this._expectedTransactionCount = 0;
    this._receivedTransactionCount = 0;
  }
}
