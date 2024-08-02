import { Block, Transaction } from '../../interfaces';

export abstract class BaseCollector {
  protected _expectedTransactionCount: number = 0;
  protected _receivedTransactionCount: number = 0;

  public abstract add(block: Block, txData: any): void;
  public abstract collectAllTransactions(): Transaction[];
  public abstract reset(): void;

  public setExpectedTransactionCount(count: number): void {
    this._expectedTransactionCount = count;
  }

  public isComplete(): boolean {
    return this._receivedTransactionCount === this._expectedTransactionCount;
  }
}
