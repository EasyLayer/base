import { AggregateRoot } from '@easylayer/core/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerBlocksAddedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerReorganisationProcessedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';

enum IndexerStatuses {
  AWAITING = 'awaiting',
  REORGANISATION = 'reorganisation',
}

type LightBlock = {
  height: number;
  hash: string;
  prevHash: string;
  tx: string[];
};

type Chain = {
  block: LightBlock;
  next: Chain | null;
  prev: Chain | null;
};

/**
 * Blockchain class representing a doubly linked list of blocks.
 * Each block contains a height, hash, previous hash and batches. The blockchain has a fixed maximum size,
 * and automatically removes the oldest blocks when new blocks are added beyond this size.
 */
export class Blockchain {
  private head: Chain | null = null;
  private tail: Chain | null = null;
  private _size: number = 0;
  // NOTE: _maxSize - Maximum number of blocks allowed in the blockchain at any given time.
  private readonly _maxSize: number = 100;

  // Gets the hash of the first block in the chain.
  // Complexity: O(1)
  get firstBlockHash(): string {
    return this.head ? this.head.block.hash : '';
  }

  get lastBlock(): LightBlock | undefined {
    if (this.tail) {
      return this.tail.block;
    }
  }

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
   * @returns {number} The height of the last block, or -1 if the chain is empty.
   * Complexity: O(1)
   */
  get lastBlockHeight(): number {
    if (this.tail) {
      return this.tail.block.height;
    } else {
      // IMPORTANT: the blockchain starts from block 0,
      // so if there are no blocks at all, we use -1
      return -1;
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
   * @param {string | number} height - The height of the new block.
   * @param {string} hash - The hash of the new block.
   * @param {string} prevHash - The hash of the previous block.
   * @returns {boolean} True if the block was added successfully, false otherwise.
   * Complexity: O(1)
   */
  public addBlock(height: number, hash: string, prevHash: string, tx: string[]): boolean {
    // Before adding a block, we validate it
    if (!this.validateNextBlock(height, prevHash)) {
      return false;
    }

    const newBlock: LightBlock = { height, hash, prevHash, tx };
    const newNode: Chain = { block: newBlock, next: null, prev: this.tail };

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
      this.removeOldestChain();
    }

    return true;
  }

  /**
   * Adds an array of blocks to the chain.
   * @param {Array<LightBlock>} blocks - Array of blocks to add.
   * @returns {boolean} True if the blocks were added successfully, false otherwise.
   * Complexity: O(n), where n - is the number of blocks in the array
   */
  public addBlocks(blocks: LightBlock[]): boolean {
    // Before adding a block, we validate it
    if (!this.validateNextBlocks(blocks)) {
      return false;
    }

    for (const block of blocks) {
      const newNode: Chain = { block, next: null, prev: this.tail };

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
        this.removeOldestChain();
      }
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
   * @param {string | number} height - The height of the new block.
   * @param {string} prevHash - The hash of the previous block.
   * @returns {boolean} True if the block is valid, false otherwise.
   * Complexity: O(1)
   */
  public validateNextBlock(height: number, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check if the given height is exactly one more than the last block's height.
    if (this.tail.block.height + 1 !== height) {
      return false;
    }

    // Check if the given previous hash matches the last block's hash.
    if (this.tail.block.hash !== prevHash) {
      return false;
    }

    return true;
  }

  /**
   * Validates an array of blocks to be added to the chain.
   * Ensures that the blocks are in the correct order and can be added sequentially.
   * @param {Array<any>} blocks - Array of blocks to validate.
   * @returns {boolean} True if all blocks are valid and in the correct order, false otherwise.
   * Complexity: O(n), where n - is the number of blocks in the array
   */
  public validateNextBlocks(blocks: any): boolean {
    if (blocks.length === 0) {
      return false; // Empty array is invalid
    }

    // Check if the first block in the array can be added to the current chain
    const firstBlock = blocks[0];
    if (!this.validateNextBlock(Number(firstBlock.height), firstBlock.previousblockhash)) {
      return false; // First block doesn't fit into the current chain
    }

    // Now validate the rest of the blocks in the array to ensure they form a proper sequence
    for (let i = 1; i < blocks.length; i++) {
      const prevBlock = blocks[i - 1];
      const currentBlock = blocks[i];

      if (
        Number(currentBlock.height) !== Number(prevBlock.height) + 1 ||
        currentBlock.previousblockhash !== prevBlock.hash
      ) {
        return false; // Sequence or hash mismatch within the provided blocks
      }
    }

    return true; // All blocks are valid and in the correct order
  }

  /**
   * Validates the entire blockchain.
   * @returns {boolean} True if the blockchain is valid, false otherwise.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public validateChain(): boolean {
    let current = this.head;

    if (!current) {
      // An empty chain is considered valid
      return true;
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

    // Если цикл завершился и current указывает на последний блок (this.tail)
    return current === this.tail;
  }

  /**
   * Validates that the provided block data matches the last block in the chain.
   * @param {number} height - The expected height of the last block.
   * @param {string} hash - The expected hash of the last block.
   * @param {string} prevHash - The expected previous hash of the last block.
   * @returns {boolean} True if the provided data matches the last block, false otherwise.
   * NOTE: This method is needed for the case when we confirm the indexing of a block
   * in another command to make sure that the block we are passing exactly matches the chain
   * Complexity: O(1)
   */
  public validateLastBlock(height: number, hash: string, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check that the height of the last block matches the passed height.
    if (this.tail.block.height !== height) {
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
   * @param {number} height - The height of the block to find.
   * @returns {LightBlock | null} The block, or null if not found.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public findBlockByHeight(height: number): LightBlock | null {
    let currentNode = this.tail;
    while (currentNode) {
      if (currentNode.block.height === height) {
        return currentNode.block;
      }
      currentNode = currentNode.prev;
    }
    return null;
  }

  /**
   * Truncates the blockchain just before a specified block height.
   * @param {number} height - The height before which the chain should be truncated.
   * @returns {boolean} Returns true if truncation was successful, false if the block was not found.
   * Complexity: O(n), where n - is the number of blocks in the chain
   */
  public truncateToBlock(height: number): boolean {
    let currentNode = this.tail;
    let found = false;

    // Iterate backwards from the last block
    // until we find the block immediately before the given height
    while (currentNode && currentNode.prev) {
      if (currentNode.prev.block.height === height - 1) {
        // Update the tail to the block before the specified height
        this.tail = currentNode.prev;

        // Delete all blocks after the found block
        this.tail.next = null;

        // Update the size
        this._size = this.tail.block.height + 1;

        found = true;
        break;
      }
      currentNode = currentNode.prev;
    }

    // Delete all blocks if the specified height is 1 (cut off the entire chain)
    if (height === 0 && this.head) {
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
  private removeOldestChain(): LightBlock | null {
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

  /**
   * Gets the last N blocks from the blockchain in reverse order.
   * @param {number} n - The number of blocks to retrieve.
   * @returns {LightBlock[]} An array containing the last N blocks in the chain, in reverse order.
   * Complexity: O(n), where n - is the number of blocks to retrieve
   */
  public getLastNBlocks(n: number): LightBlock[] {
    if (n <= 0) {
      return [];
    }

    const blocks: LightBlock[] = [];
    let currentNode = this.tail;
    let count = 0;

    while (currentNode && count < n) {
      blocks.push(currentNode.block);
      currentNode = currentNode.prev;
      count++;
    }

    // Reverse the array to get the correct order
    return blocks.reverse();
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
  public async init({
    requestId,
    startHeight,
    restoreBlocks,
  }: {
    requestId: string;
    startHeight: string | number;
    restoreBlocks: string[];
  }) {
    const status = this.status || IndexerStatuses.AWAITING;
    const lastBlockHeight = this.chain.lastBlockHeight;
    // NOTE: lastBlockHeight - is the last already indexed block and
    // if it's start of blockchain where genesis block height is '0'
    // so we indicate the last indexed block adjusted by -1.
    // startHeight - is the height from which the user wants to index, it cannot be less than 0.
    const height = lastBlockHeight + 1 > Number(startHeight) ? lastBlockHeight : Number(startHeight) - 1;

    await this.apply(
      new BitcoinBalancesIndexerInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status,
        indexedHeight: height.toString(),
        restoreBlocks,
      })
    );
  }

  public async addBlocks({
    blocks,
    requestId,
    service,
    logger,
  }: {
    blocks: any;
    requestId: string;
    service: any;
    logger: any;
  }) {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error("addBlocks() Reorganisation hasn't finished yet");
    }

    const isValid = this.chain.validateNextBlocks(blocks);

    if (!isValid) {
      return await this.startReorganisation({
        requestId,
        service,
        logger,
        blocks: [],
      });
    }

    logger.info(
      'Balances successfull indexed',
      {
        blocksHeight: blocks[blocks.length - 1].height,
        blocksLength: blocks.length,
        txLength: blocks.reduce((result: number, item: any) => result + item.tx.length, 0),
        outputsLength: blocks.reduce(
          (result: number, item: any) => result + item.tx.reduce((r: number, i: any) => r + i.vout.length, 0),
          0
        ),
      },
      this.constructor.name
    );

    return await this.apply(
      new BitcoinBalancesIndexerBlocksAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        blocks: blocks.map((block: any) => ({
          ...block,
          tx: block.tx.map((t: any) => t.txid),
        })),
      })
    );
  }

  public async processReorganisation({
    blocks,
    height,
    requestId,
    logger,
  }: {
    blocks: LightBlock[];
    height: string | number;
    requestId: string;
    logger: any;
  }): Promise<void> {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error("processReorganisation() Reorganisation hasn't started yet");
    }

    if (Number(height) > this.chain.lastBlockHeight) {
      throw new Error('Wrong block height');
    }

    // Проверяем сайз блоков и смотрим будем ли мы разбивать на несколько событий
    if (blocks.length > 100) {
      // Тут мы типо отберем часть блоков
      const blocksToProcessed = blocks;

      logger.info(
        `Blockchain continue reorganising by blocks count`,
        {
          blocksLength: blocksToProcessed.length,
        },
        this.constructor.name
      );

      return await this.apply(
        new BitcoinBalancesIndexerReorganisationProcessedEvent({
          aggregateId: this.aggregateId,
          requestId,
          // NOTE: height - height of reorganization (last correct block)
          height: height.toString(),
          blocks: blocksToProcessed,
        })
      );
    }

    logger.info(
      `Blockchain successfull reorganised to height`,
      {
        height,
      },
      this.constructor.name
    );

    return await this.apply(
      new BitcoinBalancesIndexerReorganisationFinishedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        // NOTE: height - height of reorganization (last correct block)
        height: height.toString(),
      })
    );
  }

  public async startReorganisation({
    height,
    requestId,
    service,
    logger,
    blocks,
  }: {
    height?: number;
    requestId: string;
    service: BitcoinNetworkProviderService;
    logger: any;
    blocks: any[];
  }): Promise<void> {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error("reorganisation() Previous reorganisation hasn't finished yet");
    }

    // NOTE: We move from the last block in the chain and look for the last match with the provider network
    const prevHeight = height ? height : this.chain.lastBlockHeight;
    const localBlock = this.chain.findBlockByHeight(prevHeight);
    const oldBlock = await service.getOneBlockByHeight(prevHeight);

    if (!localBlock) {
      // If we haven’t found a block by height in the chain by height,
      // then this is an error,
      // we must go back all the way to the loader and try with another block
      throw new Error('Block not found in local chain');
    }

    if (oldBlock.hash === localBlock.hash && oldBlock.previousblockhash === localBlock.prevHash) {
      // Match found

      logger.info(
        'Blockchain reorganisation starting',
        {
          reorganisationHeight: localBlock.height.toString(),
          blocksLength: blocks.length,
          txLength: blocks.reduce((result: number, item: any) => result + item.tx.length, 0),
        },
        this.constructor.name
      );

      return await this.apply(
        new BitcoinBalancesIndexerReorganisationStartedEvent({
          aggregateId: this.aggregateId,
          requestId,
          status: IndexerStatuses.REORGANISATION,
          // NOTE: height - is height of reorganisation(the last height where the blocks matched)
          height: localBlock.height.toString(),
          // NOTE: blocks that need to be reorganized
          blocks,
        })
      );
    }

    // Saving blocks for publication in an event
    const newBlocks = [...blocks, localBlock];

    // Recursive check the previous block
    return this.startReorganisation({ height: prevHeight, requestId, service, logger, blocks: newBlocks });
  }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinBalancesIndexerBlocksAddedEvent({ payload }: BitcoinBalancesIndexerBlocksAddedEvent) {
    const { blocks, status } = payload;

    this.status = status as IndexerStatuses;
    this.chain.addBlocks(blocks);
  }

  private onBitcoinBalancesIndexerReorganisationStartedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationStartedEvent) {
    const { status } = payload;
    this.status = status as IndexerStatuses;
  }

  // Тут мы полностью по выстое обреаем сразу все
  private onBitcoinBalancesIndexerReorganisationFinishedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationFinishedEvent) {
    const { height, status } = payload;
    this.status = status as IndexerStatuses;
    this.chain.truncateToBlock(Number(height));
  }

  // Тут мы обрежем только несколько блоков
  private onBitcoinBalancesIndexerReorganisationProcessedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationProcessedEvent) {
    const { blocks } = payload;
    this.chain.truncateToBlock(Number(blocks[0].height));
  }
}
