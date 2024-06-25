// import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockAddedEvent,
  BitcoinIndexerReorganisationEvent,
  BitcoinIndexerIndexBlockConfirmedEvent,
  BitcoinIndexerBlockWithConfirmAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

enum IndexerStatuses {
  AWAITING = 'awaiting',
  INDEXING = 'indexing',
  REORGANISATION = 'reorganisation',
}

type LightBlock = {
  height: bigint;
  hash: string;
  prevHash: string;
};

type ChainNode = {
  block: LightBlock;
  next: ChainNode | null;
  prev: ChainNode | null;
};

/**
 * Blockchain class representing a doubly linked list of blocks.
 * Each block contains a height, hash, and a previous hash. The blockchain has a fixed maximum size,
 * and automatically removes the oldest blocks when new blocks are added beyond this size.
 */
export class Blockchain {
  private head: ChainNode | null = null;
  private tail: ChainNode | null = null;
  private _size: number = 0;
  // NOTE: _maxSize - Maximum number of blocks allowed in the blockchain at any given time.
  private readonly _maxSize: number = 100;

  /**
   * Gets the previous hash of the last block in the chain.
   * @returns {string} The previous hash of the last block, or an empty string if the chain is empty.
   * Complexity: O(1)
   */
  get lastPrevBlockHash(): string {
    if (this.tail) {
      return this.tail.block.prevHash;
    } else {
      return '';
    }
  }

  /**
   * Gets the hash of the last block in the chain.
   * @returns {string} The hash of the last block, or an empty string if the chain is empty.
   * Complexity: O(1)
   */
  get lastBlockHash(): string {
    if (this.tail) {
      return this.tail.block.hash;
    } else {
      return '';
    }
  }

  /**
   * Gets the height of the last block in the chain.
   * @returns {bigint} The height of the last block, or -1n if the chain is empty.
   * Complexity: O(1)
   */
  get lastBlockHeight(): bigint {
    if (this.tail) {
      return this.tail.block.height;
    } else {
      // IMPORTANT: the blockchain starts from block 0,
      // so if there are no blocks at all, we use -1n
      return -1n;
    }
  }

  /**
   * Gets the size of the blockchain.
   * @returns {number} The number of blocks in the chain.
   * Complexity: O(1)
   */
  get size(): number {
    return this._size;
  }

  /**
   * Adds a block to the end of the chain.
   * @param {bigint | string | number} height - The height of the new block.
   * @param {string} hash - The hash of the new block.
   * @param {string} prevHash - The hash of the previous block.
   * @returns {boolean} True if the block was added successfully, false otherwise.
   * Complexity: O(1)
   */
  public addBlock(height: bigint | string | number, hash: string, prevHash: string): boolean {
    // Before adding a block, we validate it
    if (!this.validateNextBlock(height, prevHash)) {
      return false;
    }

    const newBlock: LightBlock = { height: BigInt(height), hash, prevHash };
    const newNode: ChainNode = { block: newBlock, next: null, prev: this.tail };

    if (this.tail) {
      this.tail.next = newNode;
    }
    this.tail = newNode;

    if (!this.head) {
      this.head = newNode;
    }

    this._size++;

    // Remove the oldest block if the chain size exceeds the maximum allowed size
    if (this._size > this._maxSize) {
      this.removeFirst();
    }

    return true;
  }

  /**
   * Gets the last block without deleting it.
   * @returns {LightBlock | null} The last block in the chain, or null if the chain is empty.
   * Complexity: O(1)
   */
  public peekLast(): LightBlock | null {
    return this.tail ? this.tail.block : null;
  }

  /**
   * Validates the next block to be added to the chain.
   * @param {bigint | string | number} height - The height of the new block.
   * @param {string} prevHash - The hash of the previous block.
   * @returns {boolean} True if the block is valid, false otherwise.
   * Complexity: O(1)
   */
  public validateNextBlock(height: bigint | string | number, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check if the given height is exactly one more than the last block's height.
    if (this.tail.block.height + 1n !== BigInt(height)) {
      return false;
    }

    // Check if the given previous hash matches the last block's hash.
    if (this.tail.block.hash !== prevHash) {
      return false;
    }

    return true;
  }

  /**
   * Validates the entire blockchain.
   * @returns {boolean} True if the blockchain is valid, false otherwise.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public validateChain(): boolean {
    let current = this.head;

    if (!current) {
      return true; // Пустая цепочка считается валидной
    }

    while (current && current.next) {
      // First check if the block heights increment by 1
      if (current.next.block.height !== current.block.height + 1n) {
        return false; // Height mismatch
      }
      // Then check if the hashes match
      if (current.next.block.prevHash !== current.block.hash) {
        return false; // Hash mismatch
      }
      current = current.next;
    }

    // Если цикл завершился и current указывает на последний блок (this.tail)
    return current === this.tail;
  }

  /**
   * Validates that the provided block data matches the last block in the chain.
   * @param {bigint | string | number} height - The expected height of the last block.
   * @param {string} hash - The expected hash of the last block.
   * @param {string} prevHash - The expected previous hash of the last block.
   * @returns {boolean} True if the provided data matches the last block, false otherwise.
   * NOTE: This method is needed for the case when we confirm the indexing of a block
   * in another command to make sure that the block we are passing exactly matches the chain
   * Complexity: O(1)
   */
  public validateLastBlock(height: bigint | string | number, hash: string, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check that the height of the last block matches the passed height.
    if (this.tail.block.height !== BigInt(height)) {
      return false;
    }

    // Check that the hash of the last block matches the passed hash
    if (this.tail.block.hash !== hash) {
      return false; // Hash mismatch
    }

    // Check that the previous hash of the last block matches the previous hash passed in.
    if (this.tail.block.prevHash !== prevHash) {
      return false;
    }

    return true;
  }

  /**
   * Finds a block by its height.
   * @param {bigint} height - The height of the block to find.
   * @returns {ChainNode | null} The node containing the block, or null if not found.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public findBlockByHeight(height: bigint): ChainNode | null {
    let currentNode = this.tail;
    while (currentNode) {
      if (currentNode.block.height === height) {
        return currentNode;
      }
      currentNode = currentNode.prev;
    }
    return null;
  }

  /**
   * Truncates the blockchain just before a specified block height.
   * @param {bigint} height - The height before which the chain should be truncated.
   * @returns {boolean} Returns true if truncation was successful, false if the block was not found.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public truncateToBlock(height: bigint): boolean {
    let currentNode = this.tail;
    let found = false;

    // Iterate backwards from the last block
    // until we find the block immediately before the given height
    while (currentNode && currentNode.prev) {
      if (currentNode.prev.block.height === height - 1n) {
        // Update the tail to the block before the specified height
        this.tail = currentNode.prev;

        // Delete all blocks after the found block
        this.tail.next = null;

        // Update the size
        this._size = Number(this.tail.block.height + 1n);

        found = true;
        break;
      }
      currentNode = currentNode.prev;
    }

    // Delete all blocks if the specified height is 1 (cut off the entire chain)
    if (height === 0n && this.head) {
      this.head = null;
      this.tail = null;
      this._size = 0;
      found = true;
    }

    return found;
  }

  /**
   * Removes the first block in the chain.
   * @returns {LightBlock | null} The removed block, or null if the chain is empty.
   * Complexity: O(1)
   */
  private removeFirst(): LightBlock | null {
    if (!this.head) return null;

    const block = this.head.block;
    this.head = this.head.next;

    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }

    this._size--;
    return block;
  }
}

export class Indexer extends AggregateRoot {
  // IMPORTANT: There must be only one Indexer Aggregate in the module,
  // so we immediately give it aggregateId by which we can find it.
  public aggregateId: string = 'indexer';
  public status!: IndexerStatuses;
  public chain: Blockchain = new Blockchain();

  // IMPORTANT: this method doing two things:
  // 1 - create Indexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const status = this.status || IndexerStatuses.AWAITING;
    const height = this.chain.lastBlockHeight.toString();

    await this.apply(
      new BitcoinIndexerInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status,
        height,
      })
    );
  }

  public async addBlock({ block, requestId }: { block: any; requestId: string }) {
    if (this.status !== IndexerStatuses.AWAITING && this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error('addBlock() Previous Block did not complete indexing');
    }

    const { height, previousblockhash } = block;

    if (!this.chain.validateNextBlock(height, previousblockhash)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(
      new BitcoinIndexerBlockAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.INDEXING,
        block,
      })
    );
  }

  public async addBlockWithImmediatelyConfirm({ block, requestId }: { block: any; requestId: string }) {
    if (this.status !== IndexerStatuses.AWAITING && this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error('addBlock() Previous Block did not complete indexing');
    }

    const { height, previousblockhash } = block;

    if (!this.chain.validateNextBlock(height, previousblockhash)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(
      new BitcoinIndexerBlockWithConfirmAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        block,
      })
    );
  }

  public async reorganisation({
    height,
    requestId,
    service,
    blocks,
  }: {
    height: bigint;
    requestId: string;
    service: BitcoinNetworkProviderService;
    blocks: any[];
  }): Promise<void> {
    if (this.status !== IndexerStatuses.AWAITING && this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error('reorganisation () Previous Block did not complete indexing');
    }

    // Get previously blocks by height - 1
    const oldBlock = await service.getOneBlockByHeight(height - 1n);
    const localBlockNode = this.chain.findBlockByHeight(height - 1n);

    if (!localBlockNode) {
      // If we haven’t found a block by height in the chain by height,
      // then this is an error,
      // we must go back all the way to the loader and try with another block
      throw new Error('Block not found in local chain');
    }

    if (oldBlock.hash === localBlockNode.block.hash && oldBlock.previousblockhash === localBlockNode.block.prevHash) {
      // Match found
      await this.apply(
        new BitcoinIndexerReorganisationEvent({
          aggregateId: this.aggregateId,
          requestId,
          status: IndexerStatuses.REORGANISATION,
          // NOTE: height - height of reorganization (last correct block)
          height: localBlockNode.block.height.toString(),
          // NOTE: We publish in the event the hashes of all blocks for which reorganization was required
          blocksHashes: blocks.map((item) => item.hash),
        })
      );
    }

    // Saving blocks for publication in an event
    const newBlocks = [...blocks, oldBlock];

    // Recursive check the previous block
    return this.reorganisation({ height: oldBlock.height, requestId, service, blocks: newBlocks });
  }

  public async confirmIndexBlock({ block, requestId }: { block: any; requestId: string }) {
    if (this.status !== IndexerStatuses.INDEXING) {
      throw new Error('Any Block did not start indexing');
    }

    const { height, hash, previousblockhash } = block;

    // Check this block in state
    if (!this.chain.validateLastBlock(height, hash, previousblockhash)) {
      throw new Error('Last block chain mismatch');
    }

    await this.apply(
      new BitcoinIndexerIndexBlockConfirmedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        block,
      })
    );
  }

  private onBitcoinIndexerInitializedEvent({ payload }: BitcoinIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinIndexerBlockAddedEvent({ payload }: BitcoinIndexerBlockAddedEvent) {
    const { block, status } = payload;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);

    this.status = status as IndexerStatuses;
  }

  private onBitcoinIndexerReorganisationEvent({ payload }: BitcoinIndexerReorganisationEvent) {
    const { height } = payload;
    this.chain.truncateToBlock(BigInt(height));
  }

  private onBitcoinIndexerIndexBlockConfirmedEvent({ payload }: BitcoinIndexerIndexBlockConfirmedEvent) {
    const { status } = payload;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinIndexerBlockWithConfirmAddedEvent({ payload }: BitcoinIndexerBlockWithConfirmAddedEvent) {
    const { block, status } = payload;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);
    this.status = status as IndexerStatuses;
  }
}
