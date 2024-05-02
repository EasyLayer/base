import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components';

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockId!: string;
  public transactions!: any[];
  // public transactionsPoolId!: string;
  public status!: string; // in_process, completed

  public async create({
    aggregateId,
    transactions,
    transactionsPoolId,
    blockId,
  }: {
    aggregateId: string;
    transactionsPoolId: string;
    transactions: any[];
    blockId: string;
  }) {
    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({ aggregateId, transactions, transactionsPoolId, blockId })
    );
  }

  public async index({ aggregateId, status }: { aggregateId: string; status: string }) {
    await this.apply(new BitcoinTransactionsBatchIndexedEvent({ aggregateId, status }));
  }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactions, blockId, transactionsPoolId } = payload;
    this.aggregateId = aggregateId;
    this.transactionsPoolId = transactionsPoolId;
    this.transactions = transactions;
    this.blockId = blockId;
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status } = payload;
    this.status = status;
  }
}
