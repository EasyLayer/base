import _ from 'lodash';
import { Block } from './interfaces';

/**
 * Class representing a queue specifically for blocks in a blockchain context.
 * Maintains a FIFO (first-in-first-out) structure for blocks, ensuring the integrity of the sequence.
 */
export class BlocksQueue<T extends Block> {
  private inStack: T[] = [];
  private outStack: T[] = [];
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
  public get length() {
    return this.inStack.length + this.outStack.length;
  }

  /**
   * Gets the height of the last block in the queue.
   * @returns The height as a bigint.
   */
  public get lastHeight(): bigint {
    return this._lastHeight;
  }

  /**
   * Sets the height of the last block in the queue.
   * @param height The new height value as a bigint.
   */
  public set lastHeight(height: bigint) {
    this._lastHeight = height;
  }

  /**
   * Fetches a block by its height from the queue.
   * @param height The height of the block to be retrieved.
   * @returns The block with the specified height.
   * @throws Error if no block is found with the specified height.
   */
  public fetchBlockByHeight(height: bigint): T {
    const block = this.inStack.concat(this.outStack).find(item => BigInt(item.height) === height);
    if (block) {
      return block;
    } else {
      throw new Error(`No block found with height ${height.toString()}`);
    }
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
          return false;
      }
      this.inStack.push(item);
      this._lastHeight = BigInt(item.height);
      return true;
  }

  /**
   * Dequeues the first block from the queue and resolves the block processing promise.
   */
  public dequeue(): void {
      if (this.outStack.length === 0) {
          this.transferItems();
      }
      if (this.outStack.length > 0) {
          const item = this.outStack.pop();
          // Resolve the promise, indicating that the block has been processed
          this.resolveNextBlock();
      }
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

      if (this.outStack.length === 0) {
        this.transferItems();
      }

      // IMPORTANT: We make sure to clone the block so that modifications to the object
      // later in the process cannot affect the block in the queue.
      return Promise.resolve(this.outStack.length > 0 ? _.cloneDeep(this.outStack[this.outStack.length - 1]) : undefined);
  }

  /**
   * Clears the queue and resets the block processing mechanism.
   */
  public clear(): void {
    // Clear the entire queue
    this.inStack = [];
    this.outStack = [];
    // Resolve the promise, indicating that the block has been processed
    this.resolveNextBlock();
    // Init the promise for the next wait
    this.initBlockProcessedPromise();
  }

  /**
   * Initializes the block processing promise.
   */
  private initBlockProcessedPromise(): void {
      this.blockProcessedPromise = new Promise<void>(resolve => {
          this.resolveNextBlock = resolve;
      });
      if (this.length === 0) {
          this.resolveNextBlock();
      }
  }

  private transferItems() {
    while (this.inStack.length > 0) {
      this.outStack.push(this.inStack.pop()!);
    }
  }
}
