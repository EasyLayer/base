import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerBlockAddedEvent,
  BitcoinIndexerReorganisationEvent,
  BitcoinIndexerIndexBlockConfirmedEvent,
  BitcoinIndexerBlockWithConfirmAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

type LightBlock = {
  height: bigint;
  hash: string;
  prevHash: string;
}

type ChainNode = {
  block: LightBlock;
  next: ChainNode | null;
  prev: ChainNode | null;
}

class Blockchain {
  private head: ChainNode | null = null;
  private tail: ChainNode | null = null;
  private _size: number = 0;
  private readonly _maxSize: number = 100;

  get lastPrevBlockHash(): string {
    if (this.tail) {
      return this.tail.block.prevHash;
    } else {
      return '';
    }
  }

  get lastBlockHash(): string {
    if (this.tail) {
      return this.tail.block.hash;
    } else {
      return '';
    }
  }

  get lastBlockHeight(): bigint {
    if (this.tail) {
      return this.tail.block.height;
    } else {
      // IMPORTANT: the blockchain starts from block 0,
      // so if there are no blocks at all, we use -1n
      return -1n;
    }
  }

  get size(): number {
    return this._size;
  }

  // Adding a block to the end of the chain
  // Сложность: O(1)
  addBlock(height: bigint | string | number, hash: string, prevHash: string): boolean {
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

  // Сложность: O(1)
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

  // Get the last block without deleting
  // Сложность: O(1)
  peekLast(): LightBlock | null {
    return this.tail ? this.tail.block : null;
  }

  // Validates all blockchain
  // Сложность: O(n), где n - количество блоков в цепи
  // validateChain(): boolean {
  //   let current = this.head;
  //   while (current && current.next) {
  //       // First check if the block heights increment by 1
  //       if (current.next.block.height !== current.block.height + 1n) {
  //         return false; // Height mismatch
  //       }
  //       // Then check if the hashes match
  //       if (current.block.hash !== current.next.block.prevHash) {
  //         return false; // Hash mismatch
  //       }
  //       current = current.next;
  //   }
  //   return true;
  // }

  // Сложность: O(1)
  validateNextBlock(height: bigint | string | number, prevHash: string): boolean {
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
   * Validates that the provided block data matches the last block in the chain.
   * @param height The expected height of the last block.
   * @param hash The expected hash of the last block.
   * @param prevHash The expected previous hash of the last block.
   * @returns {boolean} true if the provided data matches the last block, false otherwise.
   */
  // NOTE: This method is needed for the case when we confirm the indexing of a block
  // in another command to make sure that the block we are passing exactly matches the chain
  // Сложность: O(1)
  validateLastBlock(height: bigint | string | number, hash: string, prevHash: string): boolean {
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
      return false; // Несоответствие хеша
    }

    // Check that the previous hash of the last block matches the previous hash passed in.
    if (this.tail.block.prevHash !== prevHash) {
      return false;
    }

    return true;
  }

  // Method to find a block by height
  // Сложность: O(n), где n - количество блоков в цепи
  findBlockByHeight(height: bigint): ChainNode | null {
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
   */
  // Сложность: O(n), где n - количество блоков в цепи
  truncateToBlock(height: bigint): boolean {
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
}

export class Indexer extends AggregateRoot {
  public aggregateId: string = 'indexer';
  public status!: string;
  public chain: Blockchain = new Blockchain();

  // IMPORTANT: this method doing two things:
  // 1 - create Indexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const status = this.status || 'awaiting';
    const height = this.chain.lastBlockHeight.toString();

    await this.apply(new BitcoinIndexerInitializedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status,
      height
    }));
  }

  public async addBlock({ block, requestId }: { block: any, requestId: string }) {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('addBlock() Previous Block did not complete indexing');
    }

    const { height, previousblockhash } = block;

    // NOTE: This is essentially not needed here, 
    // we have to already checked this in the command in order to trigger the reorganization events
    if (!this.chain.validateNextBlock(height, previousblockhash)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(new BitcoinIndexerBlockAddedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'indexing',
      block
    }));
  }

  public async addBlockWithImmediatelyConfirm({ block, requestId }: { block: any, requestId: string }) {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('addBlock() Previous Block did not complete indexing');
    }

    const { height, hash, previousblockhash } = block;

    // NOTE: This is essentially not needed here, 
    // we have to already checked this in the command in order to trigger the reorganization events
    if (!this.chain.validateNextBlock(height, previousblockhash)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(new BitcoinIndexerBlockWithConfirmAddedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'awaiting',
      block
    }));
  }

  public async reorganisation(
    { height, requestId, service, blocks } :
    { height: bigint, requestId: string, service: BitcoinNetworkProviderService, blocks: any[] }
  ): Promise<void> {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
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
      await this.apply(new BitcoinIndexerReorganisationEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: 'reorganisation',
        height: localBlockNode.block.height.toString(), // Высота реорганизации (последнего правильного блока)
        blocks: blocks
      }));
    }

    // TODO: think about add to all this blocks status = suspended 
    // problem is that we don't want to send multiple event for same aggregate

    const newBlocks = [ ...blocks, oldBlock ];

    // Recursive check the previous block
    return this.reorganisation({ height: oldBlock.height, requestId, service, blocks: newBlocks });
  }
  
  public async confirmIndexBlock({ block, requestId }: { block: any, requestId: string }) {
    if (this.status !== 'indexing') {
      throw new Error('Any Block did not start indexing');
    }
    
    const { height, hash, previousblockhash } = block;

    // Check this block in state
    if (!this.chain.validateLastBlock(height, hash, previousblockhash)) {
      throw new Error('Last block chain mismatch');
    }

    await this.apply(new BitcoinIndexerIndexBlockConfirmedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'awaiting',
      block
    }));
  }

  private onBitcoinIndexerInitializedEvent({ payload }: BitcoinIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
  }

  private onBitcoinIndexerBlockAddedEvent({ payload }: BitcoinIndexerBlockAddedEvent) {
    const { block, status } = payload;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);
    this.status = status;
  }

  private onBitcoinIndexerReorganisationEvent({ payload }: BitcoinIndexerReorganisationEvent) {
    const { height } = payload;
    this.chain.truncateToBlock(BigInt(height));
  }

  private onBitcoinIndexerIndexBlockConfirmedEvent({ payload }: BitcoinIndexerIndexBlockConfirmedEvent) {
    const { status } = payload;
    this.status = status;
  }

  private onBitcoinIndexerBlockWithConfirmAddedEvent({ payload }: BitcoinIndexerBlockWithConfirmAddedEvent) {
    const { block, status } = payload;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);
    this.status = status;
  }
}
