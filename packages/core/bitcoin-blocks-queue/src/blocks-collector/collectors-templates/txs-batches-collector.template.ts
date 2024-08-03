import { BaseCollector } from './base-collector.template';
import { Block, Transaction, TransactionsBatch } from '../../interfaces';

export class TransactionsBatchesCollector extends BaseCollector {
  private batches: Map<number, TransactionsBatch> = new Map();

  public add({ hash, height }: Block, batch: TransactionsBatch): boolean {
    // Проверяем, что в батче высота блока и хэш относятся к этому блоку
    if (batch.blockHash !== hash || batch.blockHeight !== height) {
      return false;
    }

    // Проверяем, что батч с таким индексом еще не был добавлен
    if (this.batches.has(batch.index)) {
      return false;
    }

    this.batches.set(batch.index, batch);
    this._receivedTransactionCount += batch.transactions.length;

    return true;
  }

  public collectAllTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    for (let i = 0; i < this.batches.size; i++) {
      const batch = this.batches.get(i);
      if (batch) {
        transactions.push(...batch.transactions);
      }
    }
    return transactions;
  }

  public reset(): void {
    this.batches.clear();
    this._expectedTransactionCount = 0;
    this._receivedTransactionCount = 0;
  }
}
