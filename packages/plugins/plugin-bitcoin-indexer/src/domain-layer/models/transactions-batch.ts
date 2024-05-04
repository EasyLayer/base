import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  // BitcoinTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  public transactions!: Set<string>; // Should be Set. With Set find fast;

  public async create({
    aggregateId,
    transactions,
    blockHeight,
    blockHash
  }: {
    aggregateId: string;
    transactions: Set<string>;
    blockHeight: bigint;
    blockHash: string;
  }) {
    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({
        aggregateId,
        transactions,
        blockHeight,
        blockHash,
      })
    );
  }

  // public async index({ aggregateId, status }: { aggregateId: string; status: string }) {
  //   await this.apply(new BitcoinTransactionsBatchIndexedEvent({ aggregateId, status }));
  // }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = blockHeight;
    this.transactions = transactions;
    this.blockHash = blockHash;
  }

  // private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
  //   const { status } = payload;
  //   this.status = status;
  // }
}
