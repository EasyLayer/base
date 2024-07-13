import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinIndexerTransactionsBatchIndexedEvent,
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
  INDEXED = 'indexed',
  SUSPENDED = 'suspended',
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: bigint;
  public blockHash!: string;
  // IMPORTANT: 'tx' has Map structure to find transactions with hashes present in block.tx (O(1))
  public tx!: TransactionsMap;
  public status!: BatchStatuses;
  // IMPORTANT: 'n' - this is the batch's number in the block.
  // [0, infinite]. 0 - means the first batch in the block
  public n!: number;
  public isFinalBatch!: boolean;

  public async index({
    aggregateId,
    requestId,
    tx,
    blockHeight,
    blockHash,
    n,
    isFinalBatch,
  }: {
    aggregateId: string;
    requestId: string;
    tx: Transaction[];
    blockHeight: bigint;
    blockHash: string;
    n: number;
    isFinalBatch: boolean;
  }) {
    // Check transactions
    const batch = {
      tx,
      n,
      isFinalBatch,
    };
    await this.apply(
      new BitcoinIndexerTransactionsBatchIndexedEvent({
        aggregateId,
        requestId,
        batch, // TODO: serialize
        blockHeight: blockHeight.toString(),
        blockHash,
        status: BatchStatuses.INDEXED,
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

  private onBitcoinIndexerTransactionsBatchIndexedEvent({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) {
    const { aggregateId, blockHeight, blockHash, status, batch } = payload;
    const { tx, index, isFinalBatch } = batch;
    this.aggregateId = aggregateId;
    this.blockHeight = BigInt(blockHeight);
    this.blockHash = blockHash;
    this.status = status as BatchStatuses;
    this.index = index;
    this.isFinalBatch = isFinalBatch;
    this.tx = new Map(tx.map((transaction: Transaction) => [transaction.txid, { ...transaction, txid: null }]));
  }

  private onBitcoinIndexerTransactionsBatchSuspendedEvent({ payload }: BitcoinIndexerTransactionsBatchSuspendedEvent) {
    const { status } = payload;
    this.status = status as BatchStatuses;
  }
}
