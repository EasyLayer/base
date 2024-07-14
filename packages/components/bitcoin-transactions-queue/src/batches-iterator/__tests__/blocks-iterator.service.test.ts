// import { Test, TestingModule } from '@nestjs/testing';
// import { AppLogger } from '@easylayer/logger';
// import { BlocksQueueIteratorService } from '../batches-iterator.service';
// import { BlocksQueue } from '../../transactions-batch-queue';
// import { Block, BlocksCommandExecutor } from '../../interfaces';

// jest.mock('uuid', () => ({
//   v4: jest.fn().mockReturnValue('mock-uuid'),
// }));

// class TestBlock implements Block {
//   height: bigint;
//   hash: string;
//   tx: any[];

//   constructor(height: bigint) {
//     this.height = height;
//     this.hash = '';
//     this.tx = [];
//   }
// }

describe('BlocksQueueIteratorService', () => {
  // let mockLogger: AppLogger;
  // let mockBlocksCommandExecutor: jest.Mocked<BlocksCommandExecutor>;
  // let mockQueue: BlocksQueue<TestBlock>;
  // beforeEach(async () => {
  //   mockLogger = {
  //     debug: jest.fn(),
  //     error: jest.fn(),
  //     info: jest.fn(),
  //   } as any;
  //   mockBlocksCommandExecutor = {
  //     indexBlock: jest.fn().mockResolvedValue(undefined),
  //   } as any;
  //   mockQueue = new BlocksQueue<TestBlock>();
  //   const module: TestingModule = await Test.createTestingModule({
  //     providers: [
  //       {
  //         provide: AppLogger,
  //         useValue: mockLogger,
  //       },
  //       {
  //         provide: 'BlocksCommandExecutor',
  //         useValue: mockBlocksCommandExecutor,
  //       },
  //       BlocksQueueIteratorService,
  //     ],
  //   }).compile();
  //   service = module.get<BlocksQueueIteratorService>(BlocksQueueIteratorService);
  //   service['_queue'] = mockQueue;
  // });
  // describe('startQueueIterating', () => {
  //   it('should not start iterating if already iterating', async () => {
  //     jest.spyOn(service as any, 'initBlockProcessedPromise').mockImplementation(() => {});
  //     jest.spyOn(service as any, 'blocksIterator').mockImplementation(async function* () {});
  //     await service.startQueueIterating(mockQueue);
  //     await service.startQueueIterating(mockQueue);
  //     expect(service['isIterating']).toBe(true);
  //     expect(service['blocksIterator']).toHaveBeenCalledTimes(1);
  //     expect(service['initBlockProcessedPromise']).toHaveBeenCalledTimes(1);
  //   });
  // });
  // describe('peekFirstBlock', () => {
  //   it('should resolve the promise and return the first block', async () => {
  //     const blockMock = new TestBlock(0n);
  //     mockQueue.enqueue(blockMock);
  //     service['initBlockProcessedPromise']();
  //     service['resolveNextBlock']();
  //     const result = await service['peekFirstBlock']();
  //     expect(result).toEqual(blockMock);
  //   });
  // });
  // describe('initBlockProcessedPromise', () => {
  //   it('should create a promise and resolve it immediately if queue is empty', () => {
  //     service['initBlockProcessedPromise']();
  //     expect(service['blockProcessedPromise']).toBeInstanceOf(Promise);
  //     expect(service['resolveNextBlock']).toBeInstanceOf(Function);
  //   });
  //   it('should create a promise that can be resolved externally', async () => {
  //     const blockMock = new TestBlock(0n);
  //     mockQueue.enqueue(blockMock);
  //     service['initBlockProcessedPromise']();
  //     let resolved = false;
  //     service['blockProcessedPromise'].then(() => {
  //       resolved = true;
  //     });
  //     service['resolveNextBlock']();
  //     await service['blockProcessedPromise'];
  //     expect(resolved).toBe(true);
  //   });
  // });
  // describe('blocksIterator', () => {
  //   it('should wait for blockProcessedPromise before yielding the next block', async () => {
  //     jest.useFakeTimers({ advanceTimers: true });
  //     const blockMock = new TestBlock(0n);
  //     mockQueue.enqueue(blockMock);
  //     const blockProcessedPromise = new Promise<void>((resolve) => setTimeout(resolve, 50));
  //     service['blockProcessedPromise'] = blockProcessedPromise;
  //     jest.spyOn(mockQueue, 'peekFirstBlock').mockResolvedValue(blockMock);
  //     const blocks = [];
  //     const iterator = service['blocksIterator']();
  //     const block1 = await iterator.next();
  //     blocks.push(block1.value);
  //     // Simulate confirmation of the first block
  //     service['resolveNextBlock']();
  //     const block2 = await iterator.next();
  //     blocks.push(block2.value);
  //     jest.advanceTimersByTime(50);
  //     expect(blocks).toEqual([blockMock, blockMock]);
  //     expect(mockQueue.peekFirstBlock).toHaveBeenCalledTimes(2);
  //     jest.useRealTimers();
  //   });
  // });
});
