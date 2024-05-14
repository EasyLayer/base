import _ from 'lodash';
import { Block } from './interfaces';

/**
 * Class representing a queue specifically for blocks in a blockchain context.
 * Maintains a FIFO (first-in-first-out) structure for blocks, ensuring the integrity of the sequence.
 */
export class BlocksQueue<T extends Block> {
    private items: T[] = []; // FIFO
    private blockProcessedPromise!: Promise<void>;
    private resolveNextBlock!: () => void;
    // IMPORTANT: the blockchain starts from block 0,
    // so if there are no blocks at all, we use -1n
    private _lastHeight: bigint = -1n;

    /**
     * Initializes a new instance of BlocksQueue and sets up the initial block processing promise.
     */
    constructor() {
      this.initBlockProcessedPromise();
    }
  
    /**
     * Gets the current length of the queue.
     * @returns The number of items in the queue.
     */
    get length() {
      return this.items.length;
    }

    /**
     * Gets the height of the last block in the queue.
     * @returns The height as a bigint.
     */
    get lastHeight(): bigint {
      return this._lastHeight;
    }

    /**
     * Sets the height of the last block in the queue.
     * @param height The new height value as a bigint.
     */
    set lastHeight(height: bigint) {
      this._lastHeight = height;
    }

    public onError() {
      // NOTE: This method is needed in case of an emergency 
      // to release a promise without manipulating the queue
      this.resolveNextBlock();
    }

    /**
     * Enqueues a block to the queue if its height is exactly one more than the height of the last block.
     * @param item The block to be added to the queue.
     * @returns Boolean indicating success or failure of the enqueue operation.
     */
    // TODO: remove BigInt when add Block constructor class in service. 
    // This queue have to works only with Block interface
    public enqueue(item: T): boolean {
      if (BigInt(item.height) !== this._lastHeight + 1n) {
        // Don't add a block if its height does not strictly follow the last block
        return false;
      }

      this.items.push(item);
      this._lastHeight = BigInt(item.height);
      return true;
    }

    /**
     * Dequeues the first block from the queue and resolves the block processing promise.
     */
    public dequeue(): void {
      if (this.items.length > 0) {
        console.log('\n1dequeue', this.items[0]);
        this.items.shift();
        console.log('\n2dequeue', this.items[0]);
        // Resolve the promise, indicating that the block has been processed
        this.resolveNextBlock();
      }
    }

    /**
     * Clears the queue and resets the block processing mechanism.
     */
    public clear(): void {
      // Clear the entire queue
      this.items = [];
      // Resolve the promise, indicating that the block has been processed
      this.resolveNextBlock();
      // Init the promise for the next wait
      this.initBlockProcessedPromise();
    }

    /**
     * Peeks at the first block in the queue and waits for the block processing promise to resolve before proceeding.
     * @returns A promise that resolves to the first block in the queue or undefined if the queue is empty.
     */
    public async peekFirstBlock(): Promise<T | undefined> {
      // NOTE: Before processing the next block from the queue,
      // we wait for the resolving of the promise of the previous block
      await this.blockProcessedPromise;

      // Init the promise for the next wait
      this.initBlockProcessedPromise();

      // Peek first in block
      // IMPORTANT: We make sure to clone the block so that modifications to the object 
      // later in the process cannot affect the block in the queue.
      return this.items[0] ? _.cloneDeep(this.items[0]) : undefined;
    }

    /**
     * Initializes the block processing promise.
     */
    private initBlockProcessedPromise(): void {
      this.blockProcessedPromise = new Promise<void>(resolve => {
        this.resolveNextBlock = resolve;
      });

      // If the queue is empty, immediately resolve the promise
      if (this.items.length === 0) {
        this.resolveNextBlock();
      }
    }

    /**
     * Fetches a block by its height from the queue.
     * @param height The height of the block to be retrieved.
     * @returns The block with the specified height.
     * @throws Error if no block is found with the specified height.
     */
    public fetchBlockByHeight(height: bigint): T {
      // Method find block by height inside queue and return it 
      const block = this.items.find(item => BigInt(item.height) === height);
      if (block) {
        return block;
      } else {
        throw new Error(`No block found with height ${height.toString()}`);
      }
    }
}