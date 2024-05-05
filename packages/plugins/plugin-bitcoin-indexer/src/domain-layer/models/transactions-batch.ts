import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

export interface lightweightTransaction {
  inputs: any;
  outputs: any;
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  public transactions!: Map<string, any>; //lightweightTransaction
  public status!: string;

  public async create({
    aggregateId,
    transactions,
    blockHeight,
    blockHash
  }: {
    aggregateId: string;
    transactions: Map<string, any>;
    blockHeight: bigint;
    blockHash: string;
  }) {
    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({
        aggregateId,
        transactions,
        blockHeight,
        blockHash,
        status: 'created'
      })
    );
  }

  public async index({ requestId }: { requestId: string }) {
    // TODO: add checks
    await this.apply(new BitcoinTransactionsBatchIndexedEvent({
      aggregateId: this.aggregateId,
      status: 'completed',
      requestId
    }));
  }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash, status } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = blockHeight;
    this.transactions = transactions;
    this.blockHash = blockHash;
    this.status = status;
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status } = payload;
    this.status = status;
  }
}
