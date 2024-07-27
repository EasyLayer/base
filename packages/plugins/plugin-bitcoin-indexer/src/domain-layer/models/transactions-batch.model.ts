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
  value: number;
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
  // version: number;
  // size: number;
  // vsize: number;
  // weight: number;
  // locktime: number;
  vin: Input[];
  vout: Output[];
  // hex: string;
  // blockhash?: string; // Optional, might not be available if transaction is unconfirmed
  // confirmations?: number; // Optional, might not be available if transaction is unconfirmed
  // time?: number; // Optional, might not be available if transaction is unconfirmed
  // blocktime?: number; // Optional, might not be available if transaction is unconfirmed
}

type TxId = string;
type TransactionsMap = Map<TxId, Omit<Transaction, 'txid'> | null>; // nul???
type Index = number;

interface Batch {
  // IMPORTANT: 'tx' has Map structure to find transactions with hashes present in block.tx (O(1))
  tx: TransactionsMap;
  // IMPORTANT: 'n' - this is the batch's number in the block.
  // [0, infinite]. 0 - means the first batch in the block
  n: Index;
  isFinalBatch: boolean;
}

enum BatchStatuses {
  INDEXED = 'indexed',
  SUSPENDED = 'suspended',
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public blockHeight!: number;
  public blockHash!: string;
  public batch!: Batch;
  public status!: BatchStatuses;

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
    blockHeight: string | number;
    blockHash: string;
    n: number;
    isFinalBatch: boolean;
  }) {
    // TODO: Check transactions

    const batch = {
      tx,
      n,
      isFinalBatch,
    };

    await this.apply(
      new BitcoinIndexerTransactionsBatchIndexedEvent({
        aggregateId,
        requestId,
        batch,
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
        batch: this.batch,
        status: BatchStatuses.SUSPENDED,
      })
    );
  }

  private onBitcoinIndexerTransactionsBatchIndexedEvent({ payload }: BitcoinIndexerTransactionsBatchIndexedEvent) {
    const { aggregateId, blockHeight, blockHash, status, batch } = payload;
    const { tx, n, isFinalBatch } = batch;

    this.aggregateId = aggregateId;
    this.blockHeight = Number(blockHeight);
    this.blockHash = blockHash;
    this.status = status as BatchStatuses;

    this.batch = {
      n,
      isFinalBatch,
      tx: new Map(tx.map((t: Transaction) => [t.txid, { ...t, txid: null }])),
    };
  }

  private onBitcoinIndexerTransactionsBatchSuspendedEvent({ payload }: BitcoinIndexerTransactionsBatchSuspendedEvent) {
    const { status } = payload;
    this.status = status as BatchStatuses;
  }
}
