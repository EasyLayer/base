import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';

describe('BlocksQueue', () => {
  let queue: BlocksQueue<Block>;

  beforeEach(() => {
    queue = new BlocksQueue();
  });

  test('enqueue should add an item and sort the queue', () => {
    const block1 = { height: 2, hash: 'hash2', tx: [] };
    const block2 = { height: 1, hash: 'hash1', tx: [] };
    queue.enqueue(block1);
    queue.enqueue(block2);
    expect(queue.length).toBe(2);
    expect(queue['items'][0].height).toBe(1);
  });

  test('dequeue should return the first item in the queue', async () => {
    const block1 = { height: 1, hash: 'hash1', tx: [] };
    const block2 = { height: 2, hash: 'hash2', tx: [] };
    queue.enqueue(block1);
    queue.enqueue(block2);
    const dequeuedItem = await queue.dequeue();
    expect(dequeuedItem).toEqual(block1);
    expect(queue.length).toBe(1);
  });

  test('dequeue should wait for an item if the queue is empty', async () => {
    setTimeout(() => queue.enqueue({ height: 1, hash: 'hash1', tx: [] }), 50);
    const dequeuedItem = await queue.dequeue();
    expect(dequeuedItem.height).toBe(1);
  });

  test('requeue should add an item to the front of the queue', () => {
    const block1 = { height: 1, hash: 'hash1', tx: [] };
    const block2 = { height: 2, hash: 'hash2', tx: [] };
    queue.enqueue(block1);
    queue.requeue(block2);
    expect(queue['items'][0].height).toBe(2);
  });

  test('clear should empty the queue and reject all pending promises', () => {
    const rejectSpy = jest.fn();

    queue['waitingResolvers'].push(rejectSpy);
    queue['waitingResolvers'].push(rejectSpy);
    
    queue.clear();
    expect(queue.length).toBe(0);
    expect(queue['waitingResolvers'].length).toBe(0);
    expect(rejectSpy).toHaveBeenCalledTimes(2);
  });
});
