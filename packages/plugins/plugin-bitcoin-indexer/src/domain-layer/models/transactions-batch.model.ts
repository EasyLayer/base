import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinTransactionsBatchCreatedEvent,
  BitcoinTransactionsBatchIndexedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

interface Input {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  sequence: number;
}

interface Output {
  value: number; // The value in BTC (e.g., 0.0001 BTC)
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    reqSigs?: number;
    type: string;
    addresses?: string[];
  };
}

interface Transaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Input[];
  vout: Output[];
  hex: string;
  blockhash?: string; // Optional, might not be available if transaction is unconfirmed
  confirmations?: number; // Optional, might not be available if transaction is unconfirmed
  time?: number; // Optional, might not be available if transaction is unconfirmed
  blocktime?: number; // Optional, might not be available if transaction is unconfirmed
}

type TransactionsMap = Map<string, Omit<Transaction, 'txid'> | null>;

enum BatchStatuses {
  COMPLETED = 'completed',
  CREATED = 'created'
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  // IMPORTANT: 'transactions' has Map structure to find transactions with hashes present in tx (O(1))
  public transactions!: TransactionsMap;
  public status!: string;
  // IMPORTANT: 'index' - this is the batch's number in the block.
  // [0, infinite]. 0 - means the first batch in the block
  public index!: number;
  public isFinalBatch!: boolean;

  public async create({
    aggregateId,
    requestId,
    transactionIds,
    blockHeight,
    blockHash,
    index,
    isFinalBatch
  }: {
    aggregateId: string;
    requestId: string,
    transactionIds: string[],
    blockHeight: bigint;
    blockHash: string;
    index: number,
    isFinalBatch: boolean
  }) {

    await this.apply(
      new BitcoinTransactionsBatchCreatedEvent({
        aggregateId,
        requestId,
        transactionIds,
        blockHeight: blockHeight.toString(),
        blockHash,
        status: BatchStatuses.CREATED,
        index,
        isFinalBatch
      })
    );
  }

  public async createWithIndexing({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash,
    index,
    isFinalBatch
  }: {
    aggregateId: string;
    requestId: string,
    transactions: Transaction[],
    blockHeight: bigint;
    blockHash: string;
    index: number;
    isFinalBatch: boolean;
  }) {

    // Check transactions
    // Make sure that the sum of the inputs equals the sum of the outputs plus the commission.
    const batch = {
      transactions,
      index,
      isFinalBatch
    }
    await this.apply(
      new BitcoinTransactionsBatchWithIndexCreatedEvent({
        aggregateId,
        requestId,
        batch,
        blockHeight: blockHeight.toString(),
        blockHash,
        status: BatchStatuses.COMPLETED,
      })
    );
  }

  public async indexing({ transactions, requestId }: {
    transactions: Transaction[],
    requestId: string
  }) {

    // Check transactions
    // Make sure that the sum of the inputs equals the sum of the outputs plus the commission.
    const batch = {
      transactions,
      index: this.index,
      isFInalBatch: this.isFinalBatch
    }
    await this.apply(new BitcoinTransactionsBatchIndexedEvent({
      aggregateId: this.aggregateId,
      status: BatchStatuses.COMPLETED,
      requestId,
      batch,
      blockHash: this.blockHash,
      blockHeight: this.blockHeight.toString()
    }));
  }

  private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
    const { aggregateId, transactionIds, blockHeight, blockHash, status, index } = payload;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status;
    this.index = index;
    this.transactions = new Map(transactionIds.map((txid: string) => [
      txid, null
    ]));
  }

  private onBitcoinTransactionsBatchIndexedEvent({ payload }: BitcoinTransactionsBatchIndexedEvent) {
    const { status, batch, blockHash, blockHeight } = payload;
    const { transactions, index, isFInalBatch } = batch;
    this.status = status;
    this.transactions = new Map(transactions.map((transaction: Transaction) => [
      transaction.txid, { ...transaction, txid: null }
    ]));
    this.index = index;
    this.isFinalBatch = isFInalBatch;
    this.blockHash = blockHash;
    this.blockHeight = BigInt(blockHeight);
  }

  private onBitcoinTransactionsBatchWithIndexCreatedEvent({ payload }: BitcoinTransactionsBatchWithIndexCreatedEvent) {
    const { aggregateId, blockHeight, blockHash, status, batch } = payload;
    const { transactions, index, isFinalBatch } = batch;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status;
    this.index = index;
    this.isFinalBatch = isFinalBatch;
    this.transactions = new Map(transactions.map((transaction: Transaction) => [
      transaction.txid, { ...transaction, txid: null }
    ]));
  }
}
