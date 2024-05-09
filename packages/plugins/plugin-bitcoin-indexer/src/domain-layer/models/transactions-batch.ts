import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

export interface LightweightTransaction {
  inputs: any;
  outputs: any;
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  public transactions!: Map<string, LightweightTransaction>; //lightweightTransaction изначально lightweightTransaction будет null
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
        blockHeight: blockHeight.toString(),
        blockHash,
        status: 'created'
      })
    );
  }

  public async index({ transactions, requestId }: { transactions: LightweightTransaction, requestId: string }) {

    // Check transactions


    await this.apply(new BitcoinTransactionsBatchIndexedEvent({
      aggregateId: this.aggregateId,
      status: 'completed',
      requestId,
      transactions
    }));
  }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash, status } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.transactions = transactions;
    this.blockHash = blockHash;
    this.status = status;
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status, transactions } = payload;
    this.status = status;
    this.transactions = new Map(transactions.map((transaction: LightweightTransaction & { hash: string }) => [
      transaction.hash, {
        inputs: transaction.inputs,
        outputs: transaction.outputs
      }
    ]));
  }
}
