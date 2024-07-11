import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinIndexerTransactionsBatchCreatedEvent,
  BitcoinIndexerTransactionsBatchIndexedEvent,
  BitcoinIndexerTransactionsBatchWithIndexCreatedEvent,
  BitcoinIndexerTransactionsBatchSuspendedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';

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
  CREATED = 'created',
  SUSPENDED = 'suspended',
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  // IMPORTANT: 'transactions' has Map structure to find transactions with hashes present in tx (O(1))
  public transactions!: TransactionsMap;
  public status!: BatchStatuses;
  // IMPORTANT: 'index' - this is the batch's number in the block.
  // [0, infinite]. 0 - means the first batch in the block
  public index!: number;
  public isFinalBatch!: boolean;

  public async create({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash,
    index,
    isFinalBatch,
  }: {
    aggregateId: string;
    requestId: string;
    transactions: Transaction[];
    blockHeight: bigint;
    blockHash: string;
    index: number;
    isFinalBatch: boolean;
  }) {
    const batch = {
      transactions,
      index,
      isFinalBatch,
    };

    await this.apply(
      new BitcoinIndexerTransactionsBatchCreatedEvent({
        aggregateId,
        requestId,
        batch,
        blockHeight: blockHeight.toString(),
        blockHash,
        status: BatchStatuses.CREATED,
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
    isFinalBatch,
  }: {
    aggregateId: string;
    requestId: string;
    transactions: Transaction[];
    blockHeight: bigint;
    blockHash: string;
    index: number;
    isFinalBatch: boolean;
  }) {
    // Check transactions
    const batch = {
      transactions,
      index,
      isFinalBatch,
    };
    await this.apply(
      new BitcoinIndexerTransactionsBatchWithIndexCreatedEvent({
        aggregateId,
        requestId,
        batch,
        blockHeight: blockHeight.toString(),
        blockHash,
        status: BatchStatuses.COMPLETED,
      })
    );
  }

  public async indexing({ requestId }: { requestId: string }) {
    // Check transactions
    const batch = {
      transactions: this.transactions,
      index: this.index,
      isFinalBatch: this.isFinalBatch,
    };
    await this.apply(
      new BitcoinIndexerTransactionsBatchIndexedEvent({
        aggregateId: this.aggregateId,
        status: BatchStatuses.COMPLETED,
        requestId,
        batch,
        blockHash: this.blockHash,
        blockHeight: this.blockHeight.toString(),
      })
    );
  }

  public async suspend({ aggregateId, requestId }: { aggregateId: string; requestId: string }) {
    await this.apply(
      new BitcoinIndexerTransactionsBatchSuspendedEvent({
        aggregateId,
        requestId,
        status: BatchStatuses.SUSPENDED,
      })
    );
  }

  private onBitcoinIndexerTransactionsBatchCreatedEvent({ payload }: BitcoinIndexerTransactionsBatchCreatedEvent) {
    const { aggregateId, batch, blockHeight, blockHash, status } = payload;
    const { transactions, index, isFinalBatch } = batch;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status as BatchStatuses;
    this.index = index;
    this.isFinalBatch = isFinalBatch;
    this.transactions = new Map(
      transactions.map((transaction: Transaction) => [transaction.txid, { ...transaction, txid: null }])
    );
  }

  private onBitcoinIndexerTransactionsBatchIndexedEvent({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) {
    const { status, batch, blockHash, blockHeight } = payload;
    const { transactions, index, isFInalBatch } = batch;
    this.status = status as BatchStatuses;
    this.transactions = new Map(
      transactions.map((transaction: Transaction) => [transaction.txid, { ...transaction, txid: null }])
    );
    this.index = index;
    this.isFinalBatch = isFInalBatch;
    this.blockHash = blockHash;
    this.blockHeight = BigInt(blockHeight);
  }

  private onBitcoinIndexerTransactionsBatchWithIndexCreatedEvent({
    payload,
  }: BitcoinIndexerTransactionsBatchWithIndexCreatedEvent) {
    const { aggregateId, blockHeight, blockHash, status, batch } = payload;
    const { transactions, index, isFinalBatch } = batch;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status as BatchStatuses;
    this.index = index;
    this.isFinalBatch = isFinalBatch;
    this.transactions = new Map(
      transactions.map((transaction: Transaction) => [transaction.txid, { ...transaction, txid: null }])
    );
  }

  private onBitcoinIndexerTransactionsBatchSuspendedEvent({ payload }: BitcoinIndexerTransactionsBatchSuspendedEvent) {
    const { status } = payload;
    this.status = status as BatchStatuses;
  }
}
