import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueueIteratorService } from '../blocks-iterator.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block, BlocksCommandExecutor } from '../../interfaces';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

class TestBlock implements Block {
  height: number;
  hash: string;
  tx: any[];

  constructor(height: number, tx: any[] = []) {
    this.height = height;
    this.hash = '';
    this.tx = tx;
  }
}

describe('BlocksQueueIteratorService', () => {
  let service: BlocksQueueIteratorService;
  let mockLogger: AppLogger;
  let mockBlocksCommandExecutor: jest.Mocked<BlocksCommandExecutor>;
  let mockQueue: BlocksQueue<TestBlock>;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockBlocksCommandExecutor = {
      indexBlock: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockQueue = new BlocksQueue<TestBlock>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        {
          provide: 'BlocksCommandExecutor',
          useValue: mockBlocksCommandExecutor,
        },
        {
          provide: BlocksQueueIteratorService,
          useFactory: (logger, executor) =>
            new BlocksQueueIteratorService(logger, executor, { queueIteratorBlocksBatchSize: 2 }),
          inject: [AppLogger, 'BlocksCommandExecutor'],
        },
      ],
    }).compile();

    service = module.get<BlocksQueueIteratorService>(BlocksQueueIteratorService);
    service['_queue'] = mockQueue;
  });

  describe('initBatchProcessedPromise', () => {
    it('should create a promise and resolve it immediately if queue is empty', () => {
      service['initBatchProcessedPromise']();
      expect(service['batchProcessedPromise']).toBeInstanceOf(Promise);
      expect(service['resolveNextBatch']).toBeInstanceOf(Function);
    });

    it('should create a promise that can be resolved externally', async () => {
      const blockMock = new TestBlock(0);
      mockQueue.enqueue(blockMock);

      service['initBatchProcessedPromise']();

      let resolved = false;
      service['batchProcessedPromise'].then(() => {
        resolved = true;
      });

      service['resolveNextBatch']();
      await service['batchProcessedPromise'];
      expect(resolved).toBe(true);
    });
  });

  describe('processBatch', () => {
    it('should call blocksCommandExecutor.indexBlock with correct arguments', async () => {
      const blockMock = new TestBlock(0);
      await service['processBatch']([blockMock]);

      expect(mockBlocksCommandExecutor.indexBlock).toHaveBeenCalledWith({ batch: [blockMock], requestId: 'mock-uuid' });
    });

    it('should log an error if blocksCommandExecutor.indexBlock throws an error', async () => {
      const blockMock = new TestBlock(0);
      mockBlocksCommandExecutor.indexBlock.mockRejectedValueOnce(new Error('Test Error'));
      service['initBatchProcessedPromise']();
      await service['processBatch']([blockMock]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process the batch',
        new Error('Test Error'),
        'BlocksQueueIteratorService'
      );
    });
  });

  describe('calculateBlockSize', () => {
    it('should correctly calculate the size of a block based on the hex strings of transactions', () => {
      const tx1 = { hex: 'abcd' }; // 2 bytes
      const tx2 = { hex: '1234567890' }; // 5 bytes
      const blockMock = new TestBlock(0, [tx1, tx2]);

      const blockSize = service['calculateBlockSize'](blockMock);

      expect(blockSize).toBe(7); // 2 + 5 bytes
    });

    it('should return 0 if there are no transactions in the block', () => {
      const blockMock = new TestBlock(0);

      const blockSize = service['calculateBlockSize'](blockMock);

      expect(blockSize).toBe(0);
    });
  });

  describe('peekNextBatch', () => {
    it('should stop adding blocks to the batch if the next block would exceed the batch size', async () => {
      const tx1 = { hex: 'abcd' }; // 2 bytes
      const tx2 = { hex: '1234567890' }; // 5 bytes
      const tx3 = { hex: '12345678901234567890' }; // 10 bytes

      const blockMock1 = new TestBlock(0, [tx1]);
      const blockMock2 = new TestBlock(1, [tx2]);
      const blockMock3 = new TestBlock(2, [tx3]);

      mockQueue.enqueue(blockMock1);
      mockQueue.enqueue(blockMock2);
      mockQueue.enqueue(blockMock3);

      service['_blocksBatchSize'] = 7; // Set batch size limit to 7 bytes

      const result = await service['peekNextBatch']();

      expect(result).toEqual([blockMock1, blockMock2]);
      expect(result.length).toBe(2); // Should only include the first two blocks
    });

    it('should throw an error if a single block exceeds the batch size', async () => {
      const tx1 = { hex: '12345678901234567890' }; // 10 bytes

      const blockMock = new TestBlock(0, [tx1]);

      mockQueue.enqueue(blockMock);

      service['_blocksBatchSize'] = 5; // Set batch size limit to 5 bytes

      await expect(service['peekNextBatch']()).rejects.toThrow('Block size exceeds the minimum for adding to a batch');
    });
  });

  describe('resolveNextBatch', () => {
    it('should return the resolveNextBatch function', () => {
      service['initBatchProcessedPromise']();
      const resolveFunction = service.resolveNextBatch;

      expect(typeof resolveFunction).toBe('function');
    });
  });
});
