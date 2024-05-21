import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';

type Batch = {
  id: string;
  blockHash: string;
  blockHeight: bigint;
  walletsAddresses: string[];
}

// Пример структуры батчей как Map и индексы
// class Batchain {
//   private blocks: Map<bigint, Map<number, Batch>> = new Map();
//   private lastBlockHeight: bigint = -1n;
//   // to track the last index added
//   private lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
//   private lastBlockHash: string = '';

//   get blockCount(): number {
//     return this.blocks.size;
//   }

//   // Adding a batch to the block
//   public addBatch(batch: Batch, index: number): boolean {
//     if (!this.validateNextBatch(batch, index)) {
//       return false;
//     }

//     if (!this.blocks.has(batch.blockHeight)) {
//       this.blocks.set(batch.blockHeight, new Map());
//     }

//     const blockBatches = this.blocks.get(batch.blockHeight)!;
//     blockBatches.set(index, batch);

//     this.lastBatchIndex = index;
//     this.lastBlockHeight = batch.blockHeight;
//     this.lastBlockHash = batch.blockHash;

//     return true;
//   }

//   // Validation of the next batch
//   public validateNextBatch(batch: Batch, index: number): boolean {
//     const { blockHeight, blockHash } = batch;

//     if (blockHeight === this.lastBlockHeight && blockHash !== this.lastBlockHash) {
//       console.error('Block hash mismatch due to reorganization.');
//       return false;
//     }

//     if (blockHeight === this.lastBlockHeight) {
//       if (index !== this.lastBatchIndex + 1) {
//         console.error('Batch index out of order within block');
//         return false;
//       }
//     } else if (blockHeight === this.lastBlockHeight + 1n) {
//       if (index !== 0) {
//         console.error('First batch index of new block must be 0');
//         return false;
//       }
//       if (blockHash !== this.lastBlockHash) {
//         console.error('Previous block hash mismatch');
//         return false;
//       }
//     } else {
//       console.error('Block height out of order');
//       return false;
//     }

//     return true;
//   }

//   // Validation of the last batch
//   public validateLastBatch(batch: Batch): boolean {
//     const { blockHeight, blockHash } = batch;

//     if (blockHeight !== this.lastBlockHeight || blockHash !== this.lastBlockHash) {
//       return false;
//     }

//     const blockBatches = this.blocks.get(blockHeight);
//     if (!blockBatches) {
//       return false;
//     }

//     return this.lastBatchIndex === Math.min(...Array.from(blockBatches.keys()));
//   }

//   // Removing a block by height
//   public removeBlock(blockHeight: bigint): void {
//     if (this.blocks.size === 0) {
//       return;
//     }

//     const previousBlockHeight = blockHeight - 1n;

//     // Checking that the previous block exists
//     if (!this.blocks.has(previousBlockHeight)) {
//       return;
//     }

//     const previousBlock = this.blocks.get(previousBlockHeight)!;

//     // Checking that the previous block is not empty
//     if (previousBlock.size === 0) {
//       return;
//     }

//     // Getting data from the first batch of the previous block
//     const firstBatch = Array.from(previousBlock.values())[0];
//     const lastBatchIndex = Math.max(...Array.from(previousBlock.keys()));
//     const lastBlockHash = firstBatch.blockHash;

//     // Deleting the last block
//     this.blocks.delete(blockHeight);

//     // Updating the latest data
//     this.lastBlockHeight = previousBlockHeight;
//     this.lastBatchIndex = lastBatchIndex;
//     this.lastBlockHash = lastBlockHash;
//   }

//   // Check if all batches are processed for a block
//   public allBatchesProcessedForBlock(blockHeight: bigint): boolean {
//     const blockBatches = this.blocks.get(blockHeight);
//     if (!blockBatches) {
//       return false;
//     }

//     const batchIndices = Array.from(blockBatches.keys())// we don't need sort here .sort((a, b) => a - b);
//     return batchIndices.every((index, i) => index === i);
//   }

//   // Get batches by block height
//   public getBatchesByBlockHeight(blockHeight: bigint): Batch[] {
//     const blockBatches = this.blocks.get(blockHeight);
//     return blockBatches ? Array.from(blockBatches.values()) : [];
//   }
// }
//Пример структуры батчей как Array
class Batchain {
  private blocks: Map<bigint, Batch[]> = new Map();
  private lastBlockHeight: bigint = -1n;
  private lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
  private lastBlockHash: string = '';

  get blockCount(): number {
    return this.blocks.size;
  }

  public addBatch(batch: Batch, index: number): boolean {
    if (!this.validateNextBatch(batch, index)) {
      return false;
    }

    let batches = this.blocks.get(batch.blockHeight);
    if (!batches) {
      batches = [];
      this.blocks.set(batch.blockHeight, batches);
    }

    const arrayIndex = this.convertIndexToArrayIndex(index, batches.length);
    batches[arrayIndex] = batch;
    this.updateLastBatchInfo(batch, index);

    return true;
  }

  private validateNextBatch(batch: Batch, index: number): boolean {
    const { blockHeight, blockHash } = batch;

    if (blockHeight === this.lastBlockHeight && blockHash !== this.lastBlockHash) {
      console.error('Block hash mismatch due to reorganization.');
      return false;
    }

    if (blockHeight === this.lastBlockHeight) {
      if (index !== this.lastBatchIndex + 1) {
        console.error('Batch index out of order within block');
        return false;
      }
    } else if (blockHeight === this.lastBlockHeight + 1n) {
      if (!this.isLastBatchReceived(this.lastBlockHeight)) {
        console.error('Cannot move to the next block before receiving the last batch of the current block');
        return false;
      }
      if (index !== 0) {
        console.error('First batch index of new block must be 0');
        return false;
      }
      if (blockHash !== this.lastBlockHash) {
        console.error('Previous block hash mismatch');
        return false;
      }
    } else {
      console.error('Block height out of order');
      return false;
    }

    return true;
  }

  private convertIndexToArrayIndex(index: number, length: number): number {
    return index === 0 ? 0 : length + index;
  }

  private updateLastBatchInfo(batch: Batch, index: number): void {
    this.lastBatchIndex = index;
    this.lastBlockHeight = batch.blockHeight;
    this.lastBlockHash = batch.blockHash;
  }

  public validateLastBatch(batch: Batch): boolean {
    const { blockHeight, blockHash } = batch;

    if (blockHeight !== this.lastBlockHeight || blockHash !== this.lastBlockHash) {
      return false;
    }

    const batches = this.blocks.get(blockHeight);
    if (!batches) {
      return false;
    }

    return this.lastBatchIndex === 0;
  }

  public removeBlock(blockHeight: bigint): void {
    if (!this.blocks.has(blockHeight)) {
      return;
    }

    const previousBlockHeight = blockHeight - 1n;
    const previousBlock = this.blocks.get(previousBlockHeight);

    if (!previousBlock || previousBlock.length === 0) {
      return;
    }

    const lastBatchIndex = -previousBlock.length;
    const lastBlockHash = previousBlock[0].blockHash;

    this.blocks.delete(blockHeight);

    this.lastBlockHeight = previousBlockHeight;
    this.lastBatchIndex = lastBatchIndex;
    this.lastBlockHash = lastBlockHash;
  }

  public allBatchesProcessedForBlock(blockHeight: bigint): boolean {
    const batches = this.blocks.get(blockHeight);
    if (!batches) {
      return false;
    }

    return batches.every((batch, index) => batch && this.convertIndexToArrayIndex(index - batches.length + 1, batches.length) === index);
  }

  public getBatchesByBlockHeight(blockHeight: bigint): Batch[] {
    return this.blocks.get(blockHeight) || [];
  }

  public isLastBatchReceived(blockHeight: bigint): boolean {
    const batches = this.blocks.get(blockHeight);
    if (!batches) {
      return false;
    }

    return batches.some((_, index) => this.convertIndexToArrayIndex(index, batches.length) === 0);
  }
}

export class BalancesIndexer extends AggregateRoot {
  public aggregateId: string = 'indexer';
  public status!: string;
  public chain: Batchain = new Batchain();

  async init() {}
}
