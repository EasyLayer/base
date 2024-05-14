import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

export interface LightweightTransaction {
  txid: string;
  hash: string;
  vin: any;
  vout: any;
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  public transactions!: Map<string, LightweightTransaction>; //lightweightTransaction изначально lightweightTransaction будет null
  public status!: string;

  public async create({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash
  }: {
    aggregateId: string;
    requestId: string,
    transactions: Map<string, any>;
    blockHeight: bigint;
    blockHash: string;
  }) {

    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({
        aggregateId,
        requestId,
        transactions: Object.fromEntries(transactions),
        blockHeight: blockHeight.toString(),
        blockHash,
        status: 'created'
      })
    );
  }

  public async createWithIndex({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash
  }: {
    aggregateId: string;
    requestId: string,
    transactions: Map<string, any>;
    blockHeight: bigint;
    blockHash: string;
  }) {

    // Check transactions

    await this.apply(
      new BitcoinTransactionsBatchWithIndexCreatedEvent({
        aggregateId,
        requestId,
        transactions: Object.fromEntries(transactions),
        blockHeight: blockHeight.toString(),
        blockHash,
        status: 'completed'
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
    this.transactions = new Map(Object.entries(transactions));
    this.blockHash = blockHash;
    this.status = status;
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status, transactions } = payload;
    this.status = status;
    this.transactions = new Map(transactions.map((transaction: LightweightTransaction & { hash: string }) => [
      transaction.hash, {
        vin: transaction.vin,
        vout: transaction.vout
      }
    ]));
  }

  private onBitcoinTransactionsBatchWithIndexCreatedEvent({ payload }: BitcoinTransactionsBatchWithIndexCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash, status } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.transactions = new Map(Object.entries(transactions));
    this.blockHash = blockHash;
    this.status = status;
  }
}
