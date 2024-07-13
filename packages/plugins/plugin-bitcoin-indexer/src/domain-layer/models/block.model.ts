import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinIndexerBlockIndexedEvent,
  BitcoinIndexerBlockSuspendedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';

enum BlockStatuses {
  INDEXED = 'indexed',
  SUSPENDED = 'suspended',
}

interface BitcoinBlock {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousblockhash?: string; // Optional, might not be available for the genesis block
  nextblockhash?: string; // Optional, might not be available if this is the latest block
}

type BlockType = BitcoinBlock; // full block object without tx key
type TransactionBatchAggregateId = string;
type TransactionBatchStatus = string;
type Batches = Map<TransactionBatchAggregateId, TransactionBatchStatus>;

export class Block extends AggregateRoot {
  public aggregateId!: string; // block hash
  public block!: BlockType; // without transactions (or just with transactions hashes)
  public status!: BlockStatuses; // indexing or completed
  public batches!: Batches; // { <aggregateId>:<status> }
  public txCount!: number; // transactions lenght

  get lastBatch(): { aggregateId: TransactionBatchAggregateId; status: TransactionBatchStatus } | undefined {
    if (this.batches.size === 0) {
      return undefined;
    }

    // Convert Map to array and get the last element
    const lastKey = Array.from(this.batches.keys())[this.batches.size - 1];
    const lastValue = this.batches.get(lastKey);

    return {
      aggregateId: lastKey,
      status: lastValue!,
    };
  }

  // This is create aggregate method
  public async index({
    aggregateId,
    block,
    batches,
    requestId,
    txCount,
  }: {
    aggregateId: string;
    block: BlockType;
    requestId: string;
    batches: Map<string, string>;
    txCount: number;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, status] of batches) {
      if (status !== 'indexed') {
        throw new Error('Not all transactions batches have been indexed');
      }
    }

    await this.apply(
      new BitcoinIndexerBlockIndexedEvent({
        aggregateId,
        block,
        batches: Object.fromEntries(batches),
        requestId,
        txCount,
        status: BlockStatuses.INDEXED,
      })
    );
  }

  public async suspend({ aggregateId, requestId }: { aggregateId: string; requestId: string }) {
    await this.apply(
      new BitcoinIndexerBlockSuspendedEvent({
        aggregateId,
        requestId,
        status: BlockStatuses.SUSPENDED,
      })
    );
  }

  private onBitcoinIndexerBlockIndexedEvent({ payload }: BitcoinIndexerBlockIndexedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.batches = new Map(Object.entries(batches));
    if (status) {
      this.status = status as BlockStatuses;
    }
  }

  private onBitcoinIndexerBlockSuspendedEvent({ payload }: BitcoinIndexerBlockSuspendedEvent) {
    const { status } = payload;
    this.status = status as BlockStatuses;
  }
}
