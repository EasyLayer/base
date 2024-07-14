import { TransactionsBatchQueue } from '../transactions-batch-queue';
import { TransactionsBatch } from '../interfaces';

class TestTransactionsBatch implements TransactionsBatch {
  blockHeight: bigint;
  blockHash: string;
  prevBlockHash: string | null;
  n: number;
  isFinalBatch: boolean;
  tx: any[];

  constructor(height: bigint, hash: string, prevHash: string | null, n: number, isFinalBatch: boolean = false) {
    this.blockHeight = height;
    this.blockHash = hash;
    this.prevBlockHash = prevHash;
    this.n = n;
    this.isFinalBatch = isFinalBatch;
    this.tx = [];
  }
}

describe('TransactionsBatchQueue', () => {
  let queue: TransactionsBatchQueue<TestTransactionsBatch>;

  beforeEach(() => {
    queue = new TransactionsBatchQueue<TestTransactionsBatch>();
  });

  it('should initialize with empty queue', () => {
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  it('should enqueue batch with correct height', () => {
    const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const result = queue.enqueue(batch);
    expect(result).toBe(true);
    expect(queue.length).toBe(1);
    expect(queue.lastHeight).toBe(0n);
  });

  it('should not enqueue batch with incorrect height', () => {
    const batch = new TestTransactionsBatch(1n, 'hash1', null, 0);
    const result = queue.enqueue(batch);
    expect(result).toBe(false);
    expect(queue.length).toBe(0);
  });

  it('should dequeue batch', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    queue.dequeue();
    expect(queue.length).toBe(2);
    expect(queue.lastHeight).toBe(1n);
  });

  it('should peek first batch', async () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    queue.enqueue(batch1);
    const firstBatch = queue.peekFirstBatch();
    expect(firstBatch?.blockHeight).toBe(0n);
  });

  it('should clear the queue', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    queue.clear();
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  it('should handle multiple enqueues correctly', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    expect(queue.length).toBe(3);
    expect(queue.lastHeight).toBe(1n);
  });

  it('should return undefined when dequeuing from empty queue', () => {
    const dequeuedBatch = queue.dequeue();
    expect(dequeuedBatch).toBeUndefined();
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  it('should fetch a batch by index from inStack using binary search', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    const result = queue.fetchBatchFromInStack(1n, 'hash2', 0);
    expect(result).toBe(batch3);
  });

  it('should return undefined if batch is not found in inStack using binary search', () => {
    const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
    queue.enqueue(batch);
    const result = queue.fetchBatchFromInStack(0n, 'hash1', 1);
    expect(result).toBeUndefined();
  });

  it('should fetch a batch by index from outStack using binary search', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    queue.dequeue(); // Transfer all items to outStack and pop()
    const result = queue.fetchBatchFromOutStack(0n, 'hash1', 1);
    expect(result).toBe(batch2);
  });

  it('should return undefined if batch is not found in outStack using binary search', () => {
    const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
    queue.enqueue(batch);
    queue.dequeue(); // Transfer all items to outStack
    const result = queue.fetchBatchFromOutStack(0n, 'hash1', 1);
    expect(result).toBeUndefined();
  });

  it('should maintain order after transferItems', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    queue['transferItems'](); // Manually trigger transferItems
    expect(queue['outStack'][0]).toBe(batch3);
    expect(queue['outStack'][1]).toBe(batch2);
    expect(queue['outStack'][2]).toBe(batch1);
  });

  it('should fetch batches correctly after transferItems', () => {
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    queue.enqueue(batch3);
    queue['transferItems'](); // Manually trigger transferItems
    const resultInStack = queue.fetchBatchFromInStack(0n, 'hash1', 0);
    const resultOutStack = queue.fetchBatchFromOutStack(0n, 'hash1', 0);
    expect(resultInStack).toBeUndefined();
    expect(resultOutStack).toBe(batch1);
  });

  it('should not enqueue batch if queue is full', () => {
    queue.maxQueueLength = 2; // Set max queue length for testing
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    const result = queue.enqueue(batch3);
    expect(result).toBe(false);
    expect(queue.length).toBe(2);
    expect(queue.lastHeight).toBe(0n);
  });

  it('should not enqueue batch if max block height is reached', () => {
    queue.maxBlockHeight = 0n; // Set max block height for testing
    const batch1 = new TestTransactionsBatch(0n, 'hash1', null, 0);
    const batch2 = new TestTransactionsBatch(0n, 'hash1', null, 1, true);
    const batch3 = new TestTransactionsBatch(1n, 'hash2', 'hash1', 0, true);
    queue.enqueue(batch1);
    queue.enqueue(batch2);
    const result = queue.enqueue(batch3);
    expect(result).toBe(false);
    expect(queue.length).toBe(2);
    expect(queue.lastHeight).toBe(0n);
  });
});
