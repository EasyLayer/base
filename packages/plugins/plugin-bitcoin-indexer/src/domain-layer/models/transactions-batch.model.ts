import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

interface Vin {
  vout: number;
  scriptSig: string;
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: {
    addresses: string[];
  };
}

export interface LightweightTransaction {
  txid: string;
  hash: string;
  vin: Vin;
  vout: Vout;
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  // IMPORTANT: 'transactions' has Map structure to find transactions with hashes present in tx (O(1))
  public transactions!: Map<string, Omit<LightweightTransaction, 'txid'> | null>; //lightweightTransaction изначально lightweightTransaction будет null
  public status!: string;
  // IMPORTANT: 'index' - this is the batch's number in the block.
  // [-infinite 0]. 0 - means the last batch in the block
  public index!: number;

  public async create({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash,
    index
  }: {
    aggregateId: string;
    requestId: string,
    transactions: string[],
    blockHeight: bigint;
    blockHash: string;
    index: number
  }) {

    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({
        aggregateId,
        requestId,
        transactions,
        blockHeight: blockHeight.toString(),
        blockHash,
        status: 'created',
        index
      })
    );
  }

  public async createWithIndexing({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash,
    index
  }: {
    aggregateId: string;
    requestId: string,
    transactions: LightweightTransaction[],
    blockHeight: bigint;
    blockHash: string;
    index: number;
  }) {

    // Check transactions
    // Make sure that the sum of the inputs equals the sum of the outputs plus the commission.

    await this.apply(
      new BitcoinTransactionsBatchWithIndexCreatedEvent({
        aggregateId,
        requestId,
        transactions,
        blockHeight: blockHeight.toString(),
        blockHash,
        index,
        status: 'completed'
      })
    );
  }

  public async indexing({ transactions, requestId }: {
    transactions: LightweightTransaction[],
    requestId: string
  }) {

    // Check transactions
    // Make sure that the sum of the inputs equals the sum of the outputs plus the commission.

    await this.apply(new BitcoinTransactionsBatchIndexedEvent({
      aggregateId: this.aggregateId,
      status: 'completed',
      requestId,
      transactions,
      blockHash: this.blockHash,
      blockHeight: this.blockHeight.toString()
    }));
  }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash, status, index } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status;
    this.index = index;
    this.transactions = new Map(transactions.map((txid: string) => [
      txid, null
    ]));
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status, transactions } = payload;
    this.status = status;
    this.transactions = new Map(transactions.map((transaction: LightweightTransaction) => [
      transaction.txid, {
        hash: transaction.hash,
        vin: transaction.vin,
        vout: transaction.vout
      }
    ]));
  }

  private onBitcoinTransactionsBatchWithIndexCreatedEvent({ payload }: BitcoinTransactionsBatchWithIndexCreatedEvent) {
    const { aggregateId, transactions, blockHeight, blockHash, status, index } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status;
    this.index = index;
    this.transactions = new Map(transactions.map((transaction: LightweightTransaction) => [
      transaction.txid, {
        hash: transaction.hash,
        vin: transaction.vin,
        vout: transaction.vout
      }
    ]));
  }
}
