import _ from 'lodash';
import sizeof from 'object-sizeof';
import { TransactionsBatch } from './interfaces';

/**
 * Class representing a queue specifically for batches of transactions.
 * Maintains a FIFO (first-in-first-out) structure for batches, ensuring the integrity of the sequence.
 */
export class TransactionsBatchQueue<T extends TransactionsBatch> {
  private inStack: T[] = [];
  private outStack: T[] = [];
  private _lastHeight: bigint = -1n;
  private _lastBatchIndex: number = -1;
  private _lastBlockHash: string = '';
  private _maxQueueLength: number = 100;
  private _maxBlockHeight: bigint = BigInt(Number.MAX_SAFE_INTEGER);

  /**
   * Checks if the queue is full.
   * @returns {boolean} True if the queue is full, false otherwise.
   * @complexity O(1)
   */
  get isQueueFull(): boolean {
    return this.length >= this._maxQueueLength;
  }

  /**
   * Checks if the maximum block height is reached.
   * @returns {boolean} True if the maximum block height is reached, false otherwise.
   * @complexity O(1)
   */
  get isMaxHeightReached(): boolean {
    return this._lastHeight >= this._maxBlockHeight;
  }

  /**
   * Gets the maximum block height.
   * @returns {bigint} The maximum block height.
   * @complexity O(1)
   */
  public get maxBlockHeight(): bigint {
    return this._maxBlockHeight;
  }

  /**
   * Sets the maximum block height.
   * @param height The maximum block height.
   * @complexity O(1)
   */
  public set maxBlockHeight(height: bigint) {
    this._maxBlockHeight = height;
  }

  /**
   * Gets the maximum queue length.
   * @returns {number} The maximum queue length.
   * @complexity O(1)
   */
  public get maxQueueLength(): number {
    return this._maxQueueLength;
  }

  /**
   * Sets the maximum queue length.
   * @param length The maximum queue length.
   * @complexity O(1)
   */
  public set maxQueueLength(length: number) {
    this._maxQueueLength = length;
  }

  /**
   * Gets the current length of the queue.
   * @returns {number} The number of items in the queue.
   * @complexity O(1)
   */
  public get length(): number {
    return this.inStack.length + this.outStack.length;
  }

  /**
   * Gets the height of the last block in the queue.
   * @returns {bigint} The height as a bigint.
   * @complexity O(1)
   */
  public get lastHeight(): bigint {
    return this._lastHeight;
  }

  /**
   * Sets the height of the last block in the queue.
   * @param height The height as a bigint.
   * @complexity O(1)
   */
  public set lastHeight(height: bigint) {
    this._lastHeight = height;
  }

  /**
   * Gets the last batch index.
   * @returns {number} The last batch index.
   * @complexity O(1)
   */
  public get lastBatchIndex(): number {
    return this._lastBatchIndex;
  }

  /**
   * Sets the last batch index.
   * @param index The last batch index.
   * @complexity O(1)
   */
  public set lastBatchIndex(index: number) {
    this._lastBatchIndex = index;
  }

  /**
   * Gets the last block hash.
   * @returns {string} The last block hash.
   * @complexity O(1)
   */
  public get lastBlockHash(): string {
    return this._lastBlockHash;
  }

  /**
   * Sets the last block hash.
   * @param hash The last block hash.
   * @complexity O(1)
   */
  public set lastBlockHash(hash: string) {
    this._lastBlockHash = hash;
  }

  /**
   * Enqueues a batch to the queue.
   * @param batch The batch to be added to the queue.
   * @returns {boolean} True if the batch was added successfully, false otherwise.
   * @complexity O(1)
   */
  public enqueue(batch: T): boolean {
    if (this.isQueueFull || this.isMaxHeightReached) {
      return false;
    }

    if (!this.isValidBatch(batch)) {
      return false;
    }

    this.inStack.push(batch);
    this._lastHeight = batch.blockHeight;
    this._lastBatchIndex = batch.n;
    this._lastBlockHash = batch.blockHash;

    if (process.env.DEBUG === 'y') {
      console.debug('TRANSACTIONS BATCH QUEUE ENQUEUE SIZE: ', sizeof(batch));
    }

    return true;
  }

  /**
   * Dequeues the first batch from the queue.
   * @returns {T | undefined} The dequeued batch or undefined if the queue is empty.
   * @complexity O(1)
   */
  public dequeue(): T | undefined {
    if (this.outStack.length === 0) {
      this.transferItems();
    }

    const batch = this.outStack.pop();

    if (process.env.DEBUG === 'y') {
      if (batch) {
        console.debug('TRANSACTIONS BATCH QUEUE DEQUEUE SIZE: ', sizeof(batch));
      }
    }

    return batch;
  }

  /**
   * Peeks at the first batch in the queue.
   * @returns {T | undefined} The first batch in the queue or undefined if the queue is empty.
   * @complexity O(1)
   */
  public peekFirstBatch(): T | undefined {
    if (this.outStack.length === 0) {
      this.transferItems();
    }

    // Clone the batch to prevent external modifications.
    return this.outStack.length > 0 ? _.cloneDeep(this.outStack[this.outStack.length - 1]) : undefined;
  }

  /**
   * Gets the first batch in the queue without removing it.
   * @returns {T | undefined} The first batch in the queue or undefined if the queue is empty.
   * @complexity O(1)
   */
  public get firstBatch(): T | undefined {
    if (this.outStack.length === 0) {
      this.transferItems();
    }
    return this.outStack[this.outStack.length - 1];
  }

  /**
   * Fetches a batch by its index from the inStack using binary search.
   * @param index The index of the batch to be retrieved.
   * @returns {T | undefined} The batch with the specified index or undefined if not found.
   * @complexity O(log n)
   */
  public fetchBatchFromInStack(index: number): T | undefined {
    return this.binarySearch(this.inStack, index, true);
  }

  /**
   * Fetches a batch by its index from the outStack using binary search.
   * @param index The index of the batch to be retrieved.
   * @returns {T | undefined} The batch with the specified index or undefined if not found.
   * @complexity O(log n)
   */
  public fetchBatchFromOutStack(index: number): T | undefined {
    return this.binarySearch(this.outStack, index, false);
  }

  /**
   * Clears the queue.
   * @complexity O(1)
   */
  public clear(): void {
    this.inStack = [];
    this.outStack = [];
    this._lastHeight = -1n;
    this._lastBatchIndex = -1;
    this._lastBlockHash = '';
  }

  /**
   * Transfers items from the inStack to the outStack.
   * @complexity O(n)
   */
  private transferItems(): void {
    while (this.inStack.length > 0) {
      this.outStack.push(this.inStack.pop()!);
    }
  }

  /**
   * Validates if the batch is in the correct order and follows the sequence rules.
   * @param batch The batch to be validated.
   * @returns {boolean} True if the batch is valid, false otherwise.
   * @complexity O(1)
   */
  private isValidBatch(batch: T): boolean {
    if (batch.blockHeight < this._lastHeight) {
      return false;
    }

    if (batch.blockHeight === this._lastHeight) {
      if (batch.blockHash !== this._lastBlockHash) {
        return false;
      }
      if (batch.n !== this._lastBatchIndex + 1) {
        return false;
      }
    } else {
      if (batch.blockHeight !== this._lastHeight + 1n) {
        return false;
      }
      if (batch.n !== 0) {
        return false;
      }
      if (batch.isFinalBatch && this._lastBatchIndex !== -1 && !this.isFinalBatchOfLastBlock()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the last batch in the last block is final.
   * @returns {boolean} True if the last batch in the last block is final, false otherwise.
   * @complexity O(1)
   */
  private isFinalBatchOfLastBlock(): boolean {
    if (this.inStack.length > 0) {
      const lastBatch = this.inStack[this.inStack.length - 1];
      return lastBatch.isFinalBatch;
    } else if (this.outStack.length > 0) {
      const lastBatch = this.outStack[0];
      return lastBatch.isFinalBatch;
    }
    return false;
  }

  /**
   * Performs binary search to find a batch by index.
   * @param stack The stack to search within.
   * @param index The index of the batch to find.
   * @param isInStack Boolean indicating if the search is in the inStack.
   * @returns The batch if found, otherwise undefined.
   * @complexity O(log n)
   */
  private binarySearch(stack: T[], index: number, isInStack: boolean): T | undefined {
    let left = 0;
    let right = stack.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midIndex = stack[mid].n;

      if (midIndex === index) {
        return stack[mid];
      } else if (isInStack) {
        if (midIndex < index) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      } else {
        if (midIndex > index) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
    }

    return undefined;
  }
}
