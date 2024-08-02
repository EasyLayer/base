import { Block, Transaction, TransactionsPage } from '../../interfaces';
import { BaseCollector } from './base-collector.template';

export class TransactionsPagesCollector extends BaseCollector {
  private pages: Map<number, TransactionsPage> = new Map();

  public add({ hash, height }: Block, page: TransactionsPage): boolean {
    // Проверяем, что в странице высота блока и хэш относятся к этому блоку
    if (page.blockHash !== hash || page.blockHeight !== height) {
      return false;
    }

    // Проверяем, что страница с таким номером еще не была добавлена
    if (this.pages.has(page.page)) {
      return false;
    }

    this.pages.set(page.page, page);
    this._receivedTransactionCount += page.transactions.length;

    return true;
  }

  public collectAllTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    for (let i = 0; i < this.pages.size; i++) {
      const page = this.pages.get(i);
      if (page) {
        transactions.push(...page.transactions);
      }
    }
    return transactions;
  }

  public reset(): void {
    this.pages.clear();
    this._expectedTransactionCount = 0;
    this._receivedTransactionCount = 0;
  }
}
