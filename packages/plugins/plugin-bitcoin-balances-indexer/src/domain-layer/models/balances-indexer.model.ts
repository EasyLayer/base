// import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBalancesIndexerInitializedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

type Batch = {
  id: string;
  blockHash: string;
  blockHeight: bigint;
}

class Batchain {
  // IMPORTANT: We use Map<number, Batch> structure here not a Set or Array because
  // we have to know sequence of batches indexes 
  private blocks: Map<bigint, Map<number, Batch>> = new Map();
  private _lastBlockHeight: bigint = -1n;
  // NOTE: to track the last index added
  private _lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
  private _lastBlockHash: string = '';
  private _size: number = 0;
  private _maxSize: number = 100;

  get blockCount(): number {
    return this.blocks.size;
  }

  get size(): number {
    return this._size;
  }

  get lastBlockHeight(): bigint {
    return this._lastBlockHeight;
  }

  get lastBlockHash(): string {
    return this._lastBlockHash;
  }

  get lastBatchIndex(): number {
    return this._lastBatchIndex;
  }

  // Adding a batch to the block
  public addBatch(batch: Batch, index: number): boolean {
    const { blockHash, blockHeight } = batch;
    
    if (!this.validateNextBatch(blockHeight, blockHash, index)) {
      return false;
    }

    if (!this.blocks.has(batch.blockHeight)) {
      this.blocks.set(batch.blockHeight, new Map());
    }

    const blockBatches = this.blocks.get(batch.blockHeight)!;
    blockBatches.set(index, batch);

    this._lastBatchIndex = index;
    this._lastBlockHeight = batch.blockHeight;
    this._lastBlockHash = batch.blockHash;
    this._size++;

    // Remove the oldest block if size exceeds maxSize
    if (this._size > this._maxSize) {
      const oldestBlockHeight = this.getOldestBlockHeight();
      if (oldestBlockHeight !== undefined) {
        this.removeBlock(oldestBlockHeight);
      }
    }

    return true;
  }

  // Get the oldest block height
  private getOldestBlockHeight(): bigint | undefined {
    if (this.blocks.size === 0) {
      return undefined;
    }
    return Array.from(this.blocks.keys()).reduce((min, key) => key < min ? key : min, this.blocks.keys().next().value);
  }

  // Validation of the next batch
  public validateNextBatch(blockHeight: bigint | string | number, blockHash: string, index: number): boolean {
    if (blockHeight === this._lastBlockHeight && blockHash !== this._lastBlockHash) {
      console.error('Block hash mismatch due to reorganization.');
      return false;
    }

    if (blockHeight === this._lastBlockHeight) {
      if (index !== this._lastBatchIndex + 1) {
        console.error('Batch index out of order within block');
        return false;
      }
    } else if (blockHeight === this._lastBlockHeight + 1n) {
      if (index !== 0) {
        console.error('First batch index of new block must be 0');
        return false;
      }
      if (blockHash !== this._lastBlockHash) {
        console.error('Previous block hash mismatch');
        return false;
      }
    } else {
      console.error('Block height out of order');
      return false;
    }

    return true;
  }

  // Validation of the last batch
  public validateLastBatch(batch: Batch): boolean {
    const { blockHeight, blockHash } = batch;

    if (blockHeight !== this._lastBlockHeight || blockHash !== this._lastBlockHash) {
      return false;
    }

    const blockBatches = this.blocks.get(blockHeight);
    if (!blockBatches) {
      return false;
    }

    return this._lastBatchIndex === Math.min(...Array.from(blockBatches.keys()));
  }

  // Removing a block by height
  public removeBlock(blockHeight: bigint): void {
    if (this.blocks.size === 0) {
      return;
    }

    const previousBlockHeight = blockHeight - 1n;

    // Checking that the previous block exists
    if (!this.blocks.has(previousBlockHeight)) {
      return;
    }

    const previousBlock = this.blocks.get(previousBlockHeight)!;

    // Checking that the previous block is not empty
    if (previousBlock.size === 0) {
      return;
    }

    // Getting data from the first batch of the previous block
    const firstBatch = Array.from(previousBlock.values())[0];
    const lastBatchIndex = Math.max(...Array.from(previousBlock.keys()));
    const lastBlockHash = firstBatch.blockHash;

    // Deleting the last block
    this.blocks.delete(blockHeight);
    this._size--;

    // Updating the latest data
    this._lastBlockHeight = previousBlockHeight;
    this._lastBatchIndex = lastBatchIndex;
    this._lastBlockHash = lastBlockHash;
  }

  // Check if all batches are processed for a block
  public allBatchesProcessedForBlock(blockHeight: bigint): boolean {
    const blockBatches = this.blocks.get(blockHeight);
    if (!blockBatches) {
      return false;
    }

    const batchIndices = Array.from(blockBatches.keys())// we don't need sort here .sort((a, b) => a - b);
    return batchIndices.every((index, i) => index === i);
  }

  // Get batches by block height
  public getBatchesByBlockHeight(blockHeight: bigint): Batch[] {
    const blockBatches = this.blocks.get(blockHeight);
    return blockBatches ? Array.from(blockBatches.values()) : [];
  }
}

export class BalancesIndexer extends AggregateRoot {
  public aggregateId: string = 'indexer';
  public status!: string;
  public chain: Batchain = new Batchain();

  // IMPORTANT: this method doing two things:
  // 1 - create BalancesIndexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const status = this.status || 'awaiting';
    const height = this.chain.lastBlockHeight;

    await this.apply(new BitcoinBalancesIndexerInitializedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status,
      height: height.toString()
    }));
  }

  // public async reorganisation(
  //   { height, requestId } :
  //   { height: bigint, requestId: string }
  // ): Promise<void> {
  //   if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
  //     throw new Error('reorganisation () Previous Block did not complete indexing');
  //   }

  //   const batches = this.chain.getBatchesByBlockHeight(height);
  //   if (!batches) {
  //     // If we haven’t found a block by height in the chain by height, 
  //     // then this is an error, 
  //     // we must go back all the way to the loader and try with another block
  //     throw new Error('Block not found in local chain');
  //   }

  //   // IMPORTANT: реорганзиация должна тольок одно событие публиковать за раз. 
  //   // Мы делаем откат на один блок и в событии передаем данные старого батча (кошельки)
  //   // и высоту реорганизации



  //   if (oldBlock.hash === localBlockNode.block.hash && oldBlock.previousblockhash === localBlockNode.block.prevHash) {
  //     // Match found
      
  //     // Update our chain by truncate entries up to the matchedBlock
  //     this.chain.truncateToBlock(oldBlock.height);

  //     await this.apply(new BitcoinIndexerReorganisationEvent({
  //       aggregateId: this.aggregateId,
  //       requestId,
  //       status: 'reorganisation',
  //       block: oldBlock
  //     }));
  //   }

  //   // Recursive check the previous block
  //   return this.reorganisation({ height: oldBlock.height, requestId, service });
  // }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
  }
}
