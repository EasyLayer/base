import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinIndexerBlockIndexStartedEvent,
  BitcoinIndexerBlockIndexCompletedEvent,
  BitcoinIndexerBlockBatchesUpdatedEvent,
  BitcoinIndexerBlockWithCompleteIndexedEvent,
  BitcoinIndexerBlockSuspendedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';

enum BlockStatuses {
  COMPLETED = 'completed',
  INDEXING = 'indexing',
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
    txCount,
    requestId,
  }: {
    aggregateId: string;
    block: BlockType;
    requestId: string;
    batches: Map<string, string>;
    txCount: number;
  }) {
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status === BlockStatuses.INDEXING) {
      throw new Error('Block already start indexing');
    }

    await this.apply(
      new BitcoinIndexerBlockIndexStartedEvent({
        aggregateId,
        block,
        batches: Object.fromEntries(batches),
        requestId,
        txCount,
        status: BlockStatuses.INDEXING,
      })
    );
  }

  // This is create aggregate method
  public async indexWithComplete({
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
    // QUESTION: if the status does not match, should I throw an error or just skip it?
    if (this.status === BlockStatuses.INDEXING) {
      throw new Error('Block already start indexing');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, status] of batches) {
      if (status !== 'completed') {
        throw new Error('Not all transactions batches have been indexed');
      }
    }

    await this.apply(
      new BitcoinIndexerBlockWithCompleteIndexedEvent({
        aggregateId,
        block,
        batches: Object.fromEntries(batches),
        requestId,
        txCount,
        status: BlockStatuses.COMPLETED,
      })
    );
  }

  public async updateBatches({ batches, requestId }: { batches: Map<string, string>; requestId: string }) {
    // IMPORTANT: here we all the time rewrite all batches
    // that is because we optimaze resoring state
    await this.apply(
      new BitcoinIndexerBlockBatchesUpdatedEvent({
        aggregateId: this.aggregateId,
        requestId,
        batches: Object.fromEntries(batches),
        block: this.block,
      })
    );
  }

  // NOTE: this method needs for complete transactions between all batches
  public async completeIndexBlock({ requestId }: { requestId: string }) {
    if (this.status === BlockStatuses.INDEXING) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [id, status] of this.batches) {
        if (status !== 'completed') {
          throw new Error('Not all transactions batches have been indexed');
        }
      }

      await this.apply(
        new BitcoinIndexerBlockIndexCompletedEvent({
          aggregateId: this.aggregateId,
          requestId,
          batches: Object.fromEntries(this.batches),
          status: BlockStatuses.COMPLETED,
          block: this.block,
          txCount: this.txCount,
        })
      );
    }
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

  private onBitcoinIndexerBlockIndexStartedEvent({ payload }: BitcoinIndexerBlockIndexStartedEvent) {
    const { aggregateId, block, status, batches } = payload;
    this.aggregateId = aggregateId;
    this.block = block;
    this.batches = new Map(Object.entries(batches));
    if (status) {
      this.status = status as BlockStatuses;
    }
  }

  private onBitcoinIndexerBlockIndexCompletedEvent({ payload }: BitcoinIndexerBlockIndexCompletedEvent) {
    const { status, batches } = payload;
    this.batches = new Map(Object.entries(batches));
    if (status) {
      this.status = status as BlockStatuses;
    }
  }

  private onBitcoinIndexerBlockBatchesUpdatedEvent({ payload }: BitcoinIndexerBlockBatchesUpdatedEvent) {
    const { batches } = payload;
    this.batches = new Map(Object.entries(batches));
  }

  private onBitcoinIndexerBlockWithCompleteIndexedEvent({ payload }: BitcoinIndexerBlockWithCompleteIndexedEvent) {
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
