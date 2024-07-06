import { BlocksQueue } from '../blocks-queue';
import { Block, Transaction } from '../interfaces';

class TestBlock implements Block {
  height: bigint;
  hash: string;
  tx: Transaction[];

  constructor(height: bigint) {
    this.height = height;
    this.hash = '';
    this.tx = [];
  }
}

describe('BlocksQueue', () => {
  let queue: BlocksQueue<TestBlock>;

  beforeEach(() => {
    queue = new BlocksQueue<TestBlock>();
  });

  test('should initialize with empty queue', () => {
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  test('should enqueue block with correct height', () => {
    const block = new TestBlock(0n);
    const result = queue.enqueue(block);
    expect(result).toBe(true);
    expect(queue.length).toBe(1);
    expect(queue.lastHeight).toBe(0n);
  });

  test('should not enqueue block with incorrect height', () => {
    const block = new TestBlock(1n);
    const result = queue.enqueue(block);
    expect(result).toBe(false);
    expect(queue.length).toBe(0);
  });

  test('should dequeue block', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue.dequeue();
    expect(queue.length).toBe(1);
    expect(queue.lastHeight).toBe(1n);
  });

  test('should peek first block', async () => {
    const block1 = new TestBlock(0n);
    queue.enqueue(block1);
    const firstBlock = await queue.peekFirstBlock();
    expect(firstBlock?.height).toBe(0n);
  });

  test('should clear the queue', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue.clear();
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  test('should handle multiple enqueues correctly', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    const block3 = new TestBlock(2n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue.enqueue(block3);
    expect(queue.length).toBe(3);
    expect(queue.lastHeight).toBe(2n);
  });

  test('should return undefined when dequeuing from empty queue', () => {
    const dequeuedBlock = queue.dequeue();
    expect(dequeuedBlock).toBeUndefined();
    expect(queue.length).toBe(0);
    expect(queue.lastHeight).toBe(-1n);
  });

  test('should fetch a block by height from inStack using binary search', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    const result = queue.fetchBlockFromInStack(1n);
    expect(result).toBe(block2);
  });

  test('should return undefined if block is not found in inStack using binary search', () => {
    const block = new TestBlock(0n);
    queue.enqueue(block);
    const result = queue.fetchBlockFromInStack(1n);
    expect(result).toBeUndefined();
  });

  test('should fetch a block by height from outStack using binary search', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue.dequeue(); // Transfer all items to outStack and pop()
    const result = queue.fetchBlockFromOutStack(1n);
    expect(result).toBe(block2);
  });

  test('should return undefined if block is not found in outStack using binary search', () => {
    const block = new TestBlock(0n);
    queue.enqueue(block);
    queue.dequeue(); // Transfer all items to outStack
    const result = queue.fetchBlockFromOutStack(1n);
    expect(result).toBeUndefined();
  });

  test('should maintain order after transferItems', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue['transferItems'](); // Manually trigger transferItems
    expect(queue['outStack'][0]).toBe(block2);
    expect(queue['outStack'][1]).toBe(block1);
  });

  test('should fetch blocks correctly after transferItems', () => {
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    queue['transferItems'](); // Manually trigger transferItems
    const resultInStack = queue.fetchBlockFromInStack(0n);
    const resultOutStack = queue.fetchBlockFromOutStack(0n);
    expect(resultInStack).toBeUndefined();
    expect(resultOutStack).toBe(block1);
  });

  test('should not enqueue block if queue is full', () => {
    queue.maxQueueLength = 2; // Set max queue length for testing
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    const block3 = new TestBlock(2n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    const result = queue.enqueue(block3);
    expect(result).toBe(false);
    expect(queue.length).toBe(2);
    expect(queue.lastHeight).toBe(1n);
  });

  test('should not enqueue block if max block height is reached', () => {
    queue.maxBlockHeight = 1n; // Set max block height for testing
    const block1 = new TestBlock(0n);
    const block2 = new TestBlock(1n);
    const block3 = new TestBlock(2n);
    queue.enqueue(block1);
    queue.enqueue(block2);
    const result = queue.enqueue(block3);
    expect(result).toBe(false);
    expect(queue.length).toBe(2);
    expect(queue.lastHeight).toBe(1n);
  });
});
