import _ from 'lodash';
import { Block } from './interfaces';

/**
 * Class representing a queue specifically for blocks in a blockchain context.
 * Maintains a FIFO (first-in-first-out) structure for blocks, ensuring the integrity of the sequence.
 */
export class BlocksQueue<T extends Block> {
  private inStack: T[] = [];
  private outStack: T[] = [];
  // IMPORTANT: the blockchain starts from block 0,
  // so if there are no blocks at all, we use -1
  private _lastHeight: number = -1;
  private _maxQueueLength: number = 100;
  private _maxBlockHeight: number = Number.MAX_SAFE_INTEGER;

  get isQueueFull(): boolean {
    return this.length >= this._maxQueueLength;
  }

  get isMaxHeightReached(): boolean {
    return this._lastHeight >= this._maxBlockHeight;
  }

  public get maxBlockHeight(): number {
    return this._maxBlockHeight;
  }

  public set maxBlockHeight(height: number) {
    this._maxBlockHeight = height;
  }

  public get maxQueueLength(): number {
    return this._maxQueueLength;
  }

  public set maxQueueLength(length: number) {
    this._maxQueueLength = length;
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
  public get lastHeight(): number {
    return this._lastHeight;
  }

  public set lastHeight(height: number) {
    this._lastHeight = height;
  }

  /**
   * Gets the first block in the queue without removing it.
   * @returns The first block in the queue or undefined if the queue is empty.
   */
  public get firstBlock(): T | undefined {
    if (this.outStack.length === 0) {
      this.transferItems();
    }
    return this.outStack[this.outStack.length - 1];
  }

  /**
   * Fetches a block by its height from the inStack using binary search.
   * @param height The height of the block to be retrieved.
   * @returns The block with the specified height or undefined if not found.
   * @complexity O(log n)
   */
  public fetchBlockFromInStack(height: number): T | undefined {
    return this.binarySearch(this.inStack, height, true);
  }

  /**
   * Fetches a block by its height from the outStack using binary search.
   * @param height The height of the block to be retrieved.
   * @returns The block with the specified height or undefined if not found.
   * @complexity O(log n)
   */
  public fetchBlockFromOutStack(height: number): T | undefined {
    return this.binarySearch(this.outStack, height, false);
  }

  /**
   * Enqueues a block to the queue if its height is exactly one more than the height of the last block.
   * @param item The block to be added to the queue.
   * @returns Boolean indicating success or failure of the enqueue operation.
   * @complexity O(1)
   */
  // TODO: remove BigInt when add Block constructor class in service.
  // This queue have to works only with Block interface
  public enqueue(block: T): boolean {
    if (this.isQueueFull || this.isMaxHeightReached) {
      return false;
    }

    if (Number(block.height) !== this._lastHeight + 1) {
      return false;
    }
    this.inStack.push(block);
    this._lastHeight = Number(block.height);

    return true;
  }

  /**
   * Dequeues the first block from the queue.
   * @returns The dequeued block or undefined if the queue is empty.
   */
  public dequeue(): T | undefined {
    if (this.outStack.length === 0) {
      this.transferItems();
    }

    const block = this.outStack.pop();

    return block;
  }

  /**
   * Peeks at the first block in the queue.
   * @returns {T | null} The first block in the queue or null if the queue is empty.
   * @complexity O(1)
   */
  public peekFirstBlock(): T | null {
    if (this.outStack.length === 0) {
      this.transferItems();
    }

    // IMPORTANT: We make sure to clone the block so that modifications to the object
    // later in the process cannot affect the block in the queue.
    return this.outStack.length > 0 ? _.cloneDeep(this.outStack[this.outStack.length - 1]) : null;
  }

  /**
   * Generator function to iterate over blocks in reverse order, without removing them.
   * @yields {T} The previous block in the queue.
   */
  public *peekPrevBlock(): Generator<T, void, unknown> {
    if (this.outStack.length === 0) {
      this.transferItems();
    }

    for (let i = this.outStack.length - 1; i >= 0; i--) {
      yield _.cloneDeep(this.outStack[i]);
    }
  }

  /**
   * Clears the queue and resets the block processing mechanism.
   */
  public clear(): void {
    // Clear the entire queue
    this.inStack = [];
    this.outStack = [];
    this._lastHeight = -1;
  }

  /**
   * Searches for blocks in the outStack by a set of hashes, starting from the end.
   * @param hashSet A set of block hashes to search for.
   * @returns An array of the found blocks.
   */
  public findBlocks(hashSet: Set<string>): T[] {
    const blocks: T[] = [];

    // Iterate through the outStack in reverse order, starting from the last element
    for (let i = this.outStack.length - 1; i >= 0; i--) {
      const block = this.outStack[i];
      if (hashSet.has(block.hash)) {
        blocks.push(block);
        if (blocks.length === hashSet.size) {
          // Break the loop if all blocks are found
          break;
        }
      }
    }

    return blocks;
  }

  /**
   * Transfers items from the inStack to the outStack.
   * @complexity O(n)
   */
  private transferItems() {
    while (this.inStack.length > 0) {
      this.outStack.push(this.inStack.pop()!);
    }
  }

  /**
   * Performs binary search to find a block by height.
   * @param stack The stack to search within.
   * @param height The height of the block to find.
   * @param isInStack Boolean indicating if the search is in the inStack.
   * @returns The block if found, otherwise undefined.
   * @complexity O(log n)
   */
  private binarySearch(stack: T[], height: number, isInStack: boolean): T | undefined {
    let left = 0;
    let right = stack.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midHeight = stack[mid].height;

      if (midHeight === height) {
        return stack[mid];
      } else if (isInStack) {
        if (midHeight < height) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      } else {
        if (midHeight > height) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
    }

    return undefined;
  }
}
