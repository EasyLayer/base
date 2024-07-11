import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerChainBacthAddedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerChainByBlockTruncatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

// const batch = {
//   blockHash: '',
//   blockHeight: '',
//   preBlockHash: '',
//   index: 0,
//   isFinalBatch: false,
//   tx: ['qwe', 'ewq']
// }

enum IndexerStatuses {
  AWAITING = 'awaiting',
  INDEXING = 'indexing',
  REORGANISATION = 'reorganisation',
}

type Batch = {
  tx: any[];
  isFinalBatch: boolean;
};

type Index = number;

type Block = {
  hash: string;
  height: bigint;
  prevHash: string;
  batches: Map<Index, Batch[]>;
};

type Chain = {
  block: Block;
  prev: Chain | null;
  next: Chain | null;
};

export class Blockchain {
  private head: Chain | null = null;
  private tail: Chain | null = null;
  private _size: number = 0;
  // NOTE: _maxSize - Maximum number of blocks allowed in the blockchain at any given time.
  private readonly _maxSize: number = 100;

  /**
   * Returns the size of the blockchain.
   * @complexity O(1)
   */
  get size(): number {
    return this._size;
  }

  /**
   * Returns the height of the last block in the blockchain.
   * @complexity O(1)
   */
  get lastBlockHeight(): bigint {
    return this.tail ? this.tail.block.height : -1n;
  }

  /**
   * Returns the hash of the last block in the blockchain.
   * @complexity O(1)
   */
  get lastBlockHash(): string {
    return this.tail ? this.tail.block.hash : '';
  }

  /**
   * Returns the last batch index in the last block of the blockchain.
   * @complexity O(1)
   */
  get lastBatchIndex(): number {
    if (this.tail && this.tail.block.batches.size > 0) {
      return Math.max(...Array.from(this.tail.block.batches.keys()));
    }
    return -1;
  }

  /**
   * Checks if the last batch in the last block is final.
   * @complexity O(1)
   */
  get isLastBatchFinal(): boolean {
    const lastIndex = this.lastBatchIndex;
    if (this.tail && lastIndex !== -1) {
      const lastBatches = this.tail.block.batches.get(lastIndex);
      return lastBatches ? lastBatches[lastBatches.length - 1].isFinalBatch : false;
    }
    return false;
  }

  /**
   * Retrieves the last block in the blockchain.
   * @returns The last block if available, otherwise null.
   * @complexity O(1)
   */
  public get lastBlock(): Block | null {
    return this.tail ? this.tail.block : null;
  }

  /**
   * Adds a batch to the blockchain.
   * @param batch The batch to add.
   * @returns true if the batch is added successfully, false otherwise.
   * @complexity O(1)
   */
  public addBatch(batch: any): boolean {
    if (!this.validateNextBatch(batch)) {
      return false;
    }

    const { blockHash, blockHeight, blockPrevHash, index, isFinalBatch, tx } = batch;
    const newBatch: Batch = { tx, isFinalBatch };

    if (this.tail && this.tail.block.hash === blockHash) {
      const block = this.tail.block;
      if (block.batches.has(index)) {
        block.batches.get(index)?.push(newBatch);
      } else {
        block.batches.set(index, [newBatch]);
      }
    } else {
      const newBlock: Block = {
        hash: blockHash,
        height: blockHeight,
        prevHash: blockPrevHash,
        batches: new Map([[index, [newBatch]]]),
      };

      const newChain: Chain = {
        block: newBlock,
        next: null,
        prev: this.tail,
      };

      if (this.tail) {
        this.tail.next = newChain;
      } else {
        this.head = newChain;
      }

      this.tail = newChain;
      this._size++;
    }

    if (this._size > this._maxSize) {
      this.removeOldestChain();
    }

    return true;
  }

  /**
   * Removes the oldest chain from the blockchain.
   * @complexity O(1)
   */
  private removeOldestChain(): void {
    if (this.head) {
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this._size--;
    }
  }

  /**
   * Validates the next batch to be added to the blockchain.
   * Checks the sequential integrity of blocks and batch indices.
   * @param newBatch The batch to validate within the block.
   * @returns true if the block and batch are valid and can be added, false otherwise.
   * @complexity O(1)
   */
  public validateNextBatch(newBatch: any): boolean {
    // // Check if the new block correctly follows the hash of the last block in the chain
    // if (this.tail && this.tail.block.hash !== newBlock.prevHash) {
    //   return false;
    // }
    console.log(newBatch);
    // // Check the height sequence of the new block
    // if (this.tail && this.tail.block.height + 1n !== newBlock.height) {
    //   return false;
    // }

    // // If it's the first batch in the new block, ensure the last batch in the last block is final
    // if (newBlock.batches.size === 0 && this.tail && !this.isLastBatchFinal) {
    //   return false;
    // }

    // // Ensure the batch index is sequential
    // const lastIndex = this.lastBatchIndex;
    // if (newBatchIndex !== lastIndex + 1) {
    //   return false;
    // }

    // // Ensure that the batch index is valid for the new block
    // if (newBlock.batches.has(newBatchIndex)) {
    //   return false;
    // }

    // // Add the batch to the block for further validation or actual insertion
    // newBlock.batches.set(newBatchIndex, [newBatch]);

    return true;
  }

  /**
   * Finds a block by its height.
   * @param height The height of the block to find.
   * @returns The block if found, null otherwise.
   * @complexity O(n), where n is the number of blocks in the chain.
   */
  public findBlockByHeight(height: bigint): Block | null {
    let current = this.head;
    while (current) {
      if (current.block.height === height) {
        return current.block;
      }
      current = current.next;
    }
    return null;
  }

  /**
   * Removes a specific batch from a block identified by block height and batch index.
   * @param blockHeight The height of the block from which to remove the batch.
   * @param batchIndex The index of the batch to remove.
   * @returns true if the batch was removed successfully, false otherwise.
   * @complexity O(n + m), where n is the number of blocks and m is the number of batches in the block.
   */
  public removeOneBatchByBlock(blockHeight: bigint, batchIndex: number): boolean {
    let current = this.head;
    while (current) {
      if (current.block.height === blockHeight) {
        if (current.block.batches.has(batchIndex)) {
          const batches = current.block.batches.get(batchIndex);
          if (batches && batches.length > 1) {
            batches.pop(); // Remove the last batch from the array
            return true;
          } else if (batches && batches.length === 1) {
            current.block.batches.delete(batchIndex);
            return true;
          }
        }
        break;
      }
      current = current.next;
    }
    return false;
  }

  /**
   * Truncates the blockchain to a specific block height.
   * @param height The height to truncate to (inclusive).
   * @returns An array of blocks that were removed.
   * @complexity O(n), where n is the number of blocks to be removed.
   */
  public truncateToBlock(height: bigint): Block[] {
    const removedBlocks: Block[] = [];
    while (this.tail && this.tail.block.height > height) {
      removedBlocks.push(this.tail.block);
      this.tail = this.tail.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
      this._size--;
    }
    return removedBlocks;
  }

  /**
   * Truncates the blockchain to a specific batch within a block.
   * @param blockHeight The height of the block to truncate at.
   * @param batchIndex The index of the batch to truncate after (exclusive).
   * @returns An array of batches that were removed from the specified block.
   * @complexity O(n + m), where n is the number of blocks and m is the number of batches removed.
   */
  public truncateToBatch(blockHeight: bigint, batchIndex: number): Batch[] {
    let removedBatches: Batch[] = [];
    const block = this.findBlockByHeight(blockHeight);
    if (block && block.batches.has(batchIndex)) {
      const batches = block.batches.get(batchIndex);
      if (batches) {
        removedBatches = batches.slice(batchIndex + 1);
        batches.splice(batchIndex + 1); // Remove batches after the given index
        block.batches.set(batchIndex, batches.slice(0, batchIndex + 1));
      }
    }
    return removedBatches;
  }

  /**
   * Validates if the specified block and batch are the last ones in the blockchain.
   * @param blockHeight The height of the block to validate.
   * @param batchIndex The index of the batch within the block to validate.
   * @returns true if the specified block and batch are the last ones in the blockchain, false otherwise.
   * @complexity O(1)
   */
  public validateLastBatch(blockHeight: bigint, batchIndex: number): boolean {
    // Check if the tail exists and the block at the tail has the specified height
    if (this.tail && this.tail.block.height === blockHeight) {
      // Check if the last index in the block's batch map equals the specified batch index
      const lastIndex = this.lastBatchIndex;
      if (lastIndex === batchIndex) {
        // Further check if the specified batch is actually the last batch in the sequence
        const lastBatches = this.tail.block.batches.get(lastIndex);
        if (lastBatches && lastBatches.length > 0) {
          // Check if the last entry in the last batches array is marked as the final batch
          return lastBatches[lastBatches.length - 1].isFinalBatch;
        }
      }
    }
    return false;
  }

  // public findBatchByBlock() {}
}

export class BalancesIndexer extends AggregateRoot {
  // IMPORTANT: There must be only one Indexer Aggregate in the module,
  // so we immediately give it aggregateId by which we can find it.
  public aggregateId: string = 'balances-indexer';
  public status!: IndexerStatuses;
  public chain: Blockchain = new Blockchain();

  // IMPORTANT: this method doing two things:
  // 1 - create Indexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId, startHeight }: { requestId: string; startHeight: bigint }) {
    const status = this.status || IndexerStatuses.AWAITING;
    const lastBlockHeight = this.chain.lastBlockHeight;
    // NOTE: lastBlockHeight - is the last already indexed block and
    // if it's start of blockchain where genesis block height is '0'
    // so we indicate the last indexed block adjusted by -1n.
    // startHeight - is the height from which the user wants to index, it cannot be less than 0.
    const height = lastBlockHeight + 1n > startHeight ? lastBlockHeight : startHeight - 1n;

    await this.apply(
      new BitcoinBalancesIndexerInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status,
        indexedHeight: height.toString(),
      })
    );
  }

  public async addTransactionsBatch({ batch, requestId }: { batch: any; requestId: string }) {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error('addBlock() Previous Block did not complete indexing');
    }

    const { blockHeight, blockHash, prevBlockHash, ...restBatch } = batch;

    if (!this.chain.validateNextBatch(batch)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(
      new BitcoinBalancesIndexerChainBacthAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        batch: restBatch,
        blockHeight,
        blockHash,
        prevBlockHash,
      })
    );
  }

  public async startReorganisation({
    height,
    requestId,
    service,
  }: {
    height: bigint;
    requestId: string;
    service: BitcoinNetworkProviderService; // TODO: here can be any service
  }): Promise<void> {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error('reorganisation () Previous Block did not complete indexing');
    }

    // Get previously blocks by height - 1
    // IMPORTANT: Here we get the block from the provider
    // (the service can be either networkTransport or networkProvider)
    const oldBlock = await service.getOneBlockByHeight(height - 1n);
    const localBlock = this.chain.findBlockByHeight(height - 1n);

    if (!localBlock) {
      // If we haven’t found a block by height in the chain by height,
      // then this is an error,
      // we must go back all the way to the loader and try with another block
      throw new Error('Block not found in local chain');
    }

    if (oldBlock.hash === localBlock.hash && oldBlock.previousblockhash === localBlock.prevHash) {
      // Match found

      // IMPORTANT: Here we are sending the first block (in the chain this is the last block)
      // from the structure and the height to which we need to reorganize
      await this.apply(
        new BitcoinBalancesIndexerReorganisationStartedEvent({
          aggregateId: this.aggregateId,
          requestId,
          status: IndexerStatuses.REORGANISATION,
          // NOTE: height - height of reorganization (last correct block)
          height: localBlock.height.toString(),
          block: this.chain.lastBlock,
        })
      );
    }

    // Recursive check the previous block
    return this.startReorganisation({ height: height - 1n, requestId, service });
  }

  public async finishReorganisation({ height, requestId }: { height: bigint; requestId: string }): Promise<void> {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error("Reorganisation hasn't started yet");
    }

    if (height !== this.chain.lastBlockHeight) {
      throw new Error('Wrong blockheight');
    }

    await this.apply(
      new BitcoinBalancesIndexerReorganisationFinishedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        // NOTE: height - height of reorganization (last correct block)
        height: height.toString(),
      })
    );
  }

  public async truncateByBlock({ height, requestId }: { height: bigint; requestId: string }) {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error('reorganisation () Previous Block did not complete indexing');
    }

    const block = this.chain.lastBlock;

    if (height !== block?.height) {
      throw new Error('Wrong block height');
    }

    await this.apply(
      new BitcoinBalancesIndexerChainByBlockTruncatedEvent({
        aggregateId: this.aggregateId,
        requestId,
        height: height.toString(),
        block,
      })
    );
  }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinBalancesIndexerChainBacthAddedEvent({ payload }: BitcoinBalancesIndexerChainBacthAddedEvent) {
    const { batch, status, blockHeight, blockHash, prevBlockHash } = payload;
    this.chain.addBatch({ ...batch, blockHash, blockHeight: BigInt(blockHeight), prevBlockHash });
    this.status = status as IndexerStatuses;
  }

  private onBitcoinBalancesIndexerReorganisationStartedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationStartedEvent) {
    const { status } = payload;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinBalancesIndexerReorganisationFinishedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationFinishedEvent) {
    const { status } = payload;
    this.status = status as IndexerStatuses;
    // NOTE: we are only updating the status,
    // because we should have already trimmed all the necessary blocks from chain
  }

  private onBitcoinBalancesIndexerChainByBlockTruncatedEvent({
    payload,
  }: BitcoinBalancesIndexerChainByBlockTruncatedEvent) {
    const { height } = payload;
    this.chain.truncateToBlock(BigInt(height));
  }
}
