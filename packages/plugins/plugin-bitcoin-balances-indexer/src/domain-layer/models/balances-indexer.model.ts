import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerChainBacthAddedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerChainByBlockTruncatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

enum IndexerStatuses {
  AWAITING = 'awaiting',
  REORGANISATION = 'reorganisation',
}

type Batch = {
  tx: any[];
  isFinalBatch: boolean;
};

type Index = number;

type Block = {
  hash: string;
  height: number;
  prevHash: string;
  batches: Map<Index, Batch>;
};

type Chain = {
  block: Block;
  prev: Chain | null;
  next: Chain | null;
};

type AddBatchParams = {
  blockHash: string;
  blockHeight: number;
  preBlockHash: string | null;
  index: number;
  isFinalBatch: boolean;
  tx: string[];
};

/**
 * Blockchain class representing a doubly linked list of blocks.
 * Each block contains a height, hash, and a previous hash. The blockchain has a fixed maximum size,
 * and automatically removes the oldest blocks when new blocks are added beyond this size.
 */
export class Blockchain {
  private head: Chain | null = null;
  private tail: Chain | null = null;
  private _size: number = 0;
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
  get lastBlockHeight(): number {
    return this.tail ? this.tail.block.height : -1;
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
      const lastBatch = this.tail.block.batches.get(lastIndex);
      return lastBatch ? lastBatch.isFinalBatch : false;
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
  public addBatch(batch: AddBatchParams): boolean {
    const { blockHash, blockHeight, preBlockHash, index, isFinalBatch, tx } = batch;

    if (!this.validateNextBatch(batch)) {
      return false;
    }

    const newBatch: Batch = { tx, isFinalBatch };
    if (this.tail && this.tail.block.hash === blockHash) {
      this.tail.block.batches.set(index, newBatch);
    } else {
      const newBlock: Block = {
        hash: blockHash,
        height: blockHeight,
        prevHash: preBlockHash || '',
        batches: new Map([[index, newBatch]]),
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
  public validateNextBatch(newBatch: AddBatchParams): boolean {
    if (!this.tail) {
      // If there are no blocks, the new batch should have index 0
      return newBatch.index === 0;
    }

    const lastBlock = this.tail.block;

    // If this is a new block, check if the hash of the previous block matches
    if (lastBlock.hash !== newBatch.blockHash) {
      if (lastBlock.hash !== newBatch.preBlockHash) {
        return false;
      }
      // Check the height of the new block
      if (lastBlock.height + 1 !== newBatch.blockHeight) {
        return false;
      }
    } else {
      // Checking the batch index sequence in the same block
      const lastBatchIndex = this.lastBatchIndex;
      if (newBatch.index !== lastBatchIndex + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Finds a block by its height.
   * @param height The height of the block to find.
   * @returns The block if found, null otherwise.
   * @complexity O(n), where n is the number of blocks in the chain.
   */
  public findBlockByHeight(height: number): Block | null {
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
  public removeOneBatchByBlock(blockHeight: number, batchIndex: number): boolean {
    let current = this.head;
    while (current) {
      if (current.block.height === blockHeight) {
        if (current.block.batches.has(batchIndex)) {
          current.block.batches.delete(batchIndex);
          return true;
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
  public truncateToBlock(height: number): Block[] {
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
  public truncateToBatch(blockHeight: number, batchIndex: number): Batch[] {
    const removedBatches: Batch[] = [];
    const block = this.findBlockByHeight(blockHeight);
    if (block) {
      for (let i = batchIndex + 1; i <= this.lastBatchIndex; i++) {
        const batch = block.batches.get(i);
        if (batch) {
          removedBatches.push(batch);
          block.batches.delete(i);
        }
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
  public validateLastBatch(blockHeight: number, batchIndex: number): boolean {
    if (this.tail && this.tail.block.height === blockHeight) {
      const lastIndex = this.lastBatchIndex;
      if (lastIndex === batchIndex) {
        const lastBatch = this.tail.block.batches.get(lastIndex);
        if (lastBatch) {
          return lastBatch.isFinalBatch;
        }
      }
    }
    return false;
  }

  /**
   * Validates the entire blockchain.
   * @returns true if the blockchain is valid, false otherwise.
   * @complexity O(n), where n is the number of blocks in the chain.
   */
  public validateChain(): boolean {
    let current = this.head;

    if (!current) {
      return true; // Пустая цепочка считается валидной
    }

    while (current && current.next) {
      // First check if the block heights increment by 1
      if (current.next.block.height !== current.block.height + 1) {
        return false; // Height mismatch
      }
      // Then check if the hashes match
      if (current.next.block.prevHash !== current.block.hash) {
        return false; // Hash mismatch
      }
      current = current.next;
    }

    return current === this.tail;
  }
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
  public async init({ requestId, startHeight }: { requestId: string; startHeight: string | number }) {
    const status = this.status || IndexerStatuses.AWAITING;
    const lastBlockHeight = this.chain.lastBlockHeight;
    // NOTE: lastBlockHeight - is the last already indexed block and
    // if it's start of blockchain where genesis block height is '0'
    // so we indicate the last indexed block adjusted by -1n.
    // startHeight - is the height from which the user wants to index, it cannot be less than 0.
    const height = lastBlockHeight + 1 > Number(startHeight) ? lastBlockHeight : Number(startHeight) - 1;

    await this.apply(
      new BitcoinBalancesIndexerInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status,
        indexedHeight: String(height),
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
        blockHeight: String(blockHeight),
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
    height: string | number;
    requestId: string;
    service: BitcoinNetworkProviderService; // TODO: here can be any service
  }): Promise<void> {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error('reorganisation () Previous Block did not complete indexing');
    }

    // Get previously blocks by height - 1
    const prevHeight = Number(height) - 1;

    // IMPORTANT: Here we get the block from the provider
    // (the service can be either networkTransport or networkProvider)
    const oldBlock = await service.getOneBlockByHeight(prevHeight);
    const localBlock = this.chain.findBlockByHeight(prevHeight);

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
      return await this.apply(
        new BitcoinBalancesIndexerReorganisationStartedEvent({
          aggregateId: this.aggregateId,
          requestId,
          status: IndexerStatuses.REORGANISATION,
          // NOTE: height - height of reorganization (last correct block)
          height: String(localBlock.height),
          block: this.chain.lastBlock,
        })
      );
    }

    // Recursive check the previous block
    return this.startReorganisation({ height: prevHeight, requestId, service });
  }

  public async finishReorganisation({
    height,
    requestId,
  }: {
    height: string | number;
    requestId: string;
  }): Promise<void> {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error("Reorganisation hasn't started yet");
    }

    if (Number(height) > this.chain.lastBlockHeight) {
      throw new Error('Wrong blockheight');
    }

    await this.apply(
      new BitcoinBalancesIndexerReorganisationFinishedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        // NOTE: height - height of reorganization (last correct block)
        height: String(height),
      })
    );
  }

  public async truncateByBlock({
    height,
    block,
    requestId,
  }: {
    height: string | number;
    block: any;
    requestId: string;
  }) {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error('reorganisation () Previous Block did not complete indexing');
    }

    const blockNeedToBeTruncate = this.chain.lastBlock;

    if (!blockNeedToBeTruncate) {
      throw new Error('Blockchain is empty');
    }

    if (Number(block.height) !== blockNeedToBeTruncate.height) {
      throw new Error('Wrong block height');
    }

    // NOTE: We have to get the new last block (height - 1)
    // and send it in the event
    const prevBlock = this.chain.findBlockByHeight(blockNeedToBeTruncate.height - 1);

    await this.apply(
      new BitcoinBalancesIndexerChainByBlockTruncatedEvent({
        aggregateId: this.aggregateId,
        requestId,
        height: String(height),
        block: prevBlock,
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
    this.chain.addBatch({ ...batch, blockHash, blockHeight: Number(blockHeight), prevBlockHash });
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
    this.chain.truncateToBlock(Number(height));
  }
}
