import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinNetworkInitializedEvent,
  BitcoinNetworkBlockAddedEvent,
  BitcoinNetworkReorganisationEvent,
  BitcoinNetworkIndexBlockConfirmedEvent,
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
  private _size: bigint = 0n;

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
      return 0n;
    }
  }

  get size(): bigint {
    return this._size;
  }

  isEmpty(): boolean {
    return this.size === 0n;
  }

  // Adding a block to the end of the chain
  addBlock(height: bigint, hash: string, prevHash: string): boolean {
    // Before adding a block, we validate it
    if (!this.validateNextBlock(height, prevHash)) {
      return false;
    }

    const newBlock: LightBlock = { height, hash, prevHash };
    const newNode: ChainNode = { block: newBlock, next: null, prev: this.tail };

    if (this.tail) {
      this.tail.next = newNode;
    }
    this.tail = newNode;

    if (!this.head) {
      this.head = newNode;
    }

    this._size++;
    return true;
  }

  // Deleting the last block
  removeLast(): LightBlock | null {
      if (!this.tail) return null;

      const block = this.tail.block;
      this.tail = this.tail.prev;

      if (this.tail) {
          this.tail.next = null;
      } else {
          this.head = null;
      }

      this._size--;
      return block;
  }

  // Get the last block without deleting
  peekLast(): LightBlock | null {
    return this.tail ? this.tail.block : null;
  }

  // Validates all blockchain
  validateChain(): boolean {
    let current = this.head;
    while (current && current.next) {
        // First check if the block heights increment by 1
        if (current.next.block.height !== current.block.height + 1n) {
          return false; // Height mismatch
        }
        // Then check if the hashes match
        if (current.block.hash !== current.next.block.prevHash) {
          return false; // Hash mismatch
        }
        current = current.next;
    }
    return true;
  }

  validateNextBlock(height: bigint, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check if the given height is exactly one more than the last block's height.
    if (this.tail.block.height + 1n !== height) {
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
  validateLastBlock(height: bigint, hash: string, prevHash: string): boolean {
    if (!this.tail) {
      // If there are no blocks, the check cannot be performed.
      throw new Error("No blocks in the blockchain.");
    }

    // Check that the height of the last block matches the passed height.
    if (this.tail.block.height !== height) {
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

        // Adjust the size of the chain
        this._size = this.tail.block.height + 1n;
        found = true;
        break;
      }
      currentNode = currentNode.prev;
    }

    // Delete all blocks if the specified height is 1 (cut off the entire chain)
    if (height === 1n && this.head) {
      this.head = null;
      this.tail = null;
      this._size = 0n;
      found = true;
    }

    return found;
  }
}

export class Network extends AggregateRoot {
  public readonly extra: string = 'network';
  public aggregateId!: string; // uuid
  public status!: string;
  public chain: Blockchain = new Blockchain();
 
  // IMPORTANT: this method doing two things:
  // 1 - create Network if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const aggregateId = this.aggregateId || uuidv4();
    const status = this.status || 'awaiting';
    const height = this.chain.lastBlockHeight;

    await this.apply(new BitcoinNetworkInitializedEvent({
      aggregateId,
      requestId,
      status,
      height: height.toString()
    }));
  }

  public async addBlock({ block, requestId }: { block: any, requestId: string }) {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('Previous Block did not complete indexing');
    }

    const { height, hash, previousblockhash } = block;

    if (!this.chain.addBlock(height, hash, previousblockhash)) {
      throw new Error('Need reorganisation');
    }

    await this.apply(new BitcoinNetworkBlockAddedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'indexing',
      block
    }));
  }

  public async reorganisation(
    { height, requestId, service } :
    { height: bigint, requestId: string, service: BitcoinNetworkProviderService }
  ): Promise<void> {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('Previous Block did not complete indexing');
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
      
      // Update our chain by truncate entries up to the matchedBlock
      this.chain.truncateToBlock(oldBlock.height);

      await this.apply(new BitcoinNetworkReorganisationEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: 'reorganisation',
        block: oldBlock
      }));
    }

    // Recursive check the previous block
    return this.reorganisation({ height: oldBlock.height, requestId, service });
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

    await this.apply(new BitcoinNetworkIndexBlockConfirmedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'awaiting',
      block
    }));
  }

  private onBitcoinNetworkInitializedEvent({ payload }: BitcoinNetworkInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
  }

  private onBitcoinNetworkBlockAddedEvent({ payload }: BitcoinNetworkBlockAddedEvent) {
    const { block } = payload;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);
  }

  private onBitcoinNetworkReorganisationEvent({ payload }: BitcoinNetworkReorganisationEvent) {
    const { block } = payload;

    const { height } = block;
    this.chain.truncateToBlock(height);
  }

  private onBitcoinNetworkIndexBlockConfirmedEvent({ payload }: BitcoinNetworkIndexBlockConfirmedEvent) {
    const { status } = payload;
    this.status = status;
  }

}
