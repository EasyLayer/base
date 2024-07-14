import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BatchesQueueIteratorService } from '../../batches-iterator';
import { TransactionsBatchQueue } from '../../transactions-batch-queue';
import { TransactionsBatch, BatchesCommandExecutor } from '../../interfaces';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

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

describe('BatchesQueueIteratorService', () => {
  let service: BatchesQueueIteratorService;
  let mockLogger: AppLogger;
  let mockBatchesCommandExecutor: jest.Mocked<BatchesCommandExecutor>;
  let mockQueue: TransactionsBatchQueue<TestTransactionsBatch>;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockBatchesCommandExecutor = {
      indexBatch: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockQueue = new TransactionsBatchQueue<TestTransactionsBatch>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        {
          provide: 'BatchesCommandExecutor',
          useValue: mockBatchesCommandExecutor,
        },
        BatchesQueueIteratorService,
      ],
    }).compile();

    service = module.get<BatchesQueueIteratorService>(BatchesQueueIteratorService);
    service['_queue'] = mockQueue;
  });

  describe('startQueueIterating', () => {
    it('should not start iterating if already iterating', async () => {
      jest.spyOn(service as any, 'initBatchProcessedPromise').mockImplementation(() => {});
      jest.spyOn(service as any, 'batchesIterator').mockImplementation(async function* () {});
      await service.startQueueIterating(mockQueue);
      await service.startQueueIterating(mockQueue);
      expect(service['isIterating']).toBe(true);
      expect(service['batchesIterator']).toHaveBeenCalledTimes(1);
      expect(service['initBatchProcessedPromise']).toHaveBeenCalledTimes(1);
    });
  });

  describe('peekFirstBatch', () => {
    it('should resolve the promise and return the first batch', async () => {
      const batchMock = new TestTransactionsBatch(0n, 'hash1', null, 0);
      mockQueue.enqueue(batchMock);
      service['initBatchProcessedPromise']();
      service['resolveNextBatch']();
      const result = await service['peekFirstBatch']();
      expect(result).toEqual(batchMock);
    });
  });

  describe('initBatchProcessedPromise', () => {
    it('should create a promise and resolve it immediately if queue is empty', () => {
      service['initBatchProcessedPromise']();
      expect(service['batchProcessedPromise']).toBeInstanceOf(Promise);
      expect(service['resolveNextBatch']).toBeInstanceOf(Function);
    });

    it('should create a promise that can be resolved externally', async () => {
      const batchMock = new TestTransactionsBatch(0n, 'hash1', null, 0);
      mockQueue.enqueue(batchMock);
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

  describe('batchesIterator', () => {
    it('should wait for batchProcessedPromise before yielding the next batch', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      const batchMock = new TestTransactionsBatch(0n, 'hash1', null, 0, true);
      mockQueue.enqueue(batchMock);

      const batchProcessedPromise = new Promise<void>((resolve) => setTimeout(resolve, 50));
      service['batchProcessedPromise'] = batchProcessedPromise;

      jest.spyOn(mockQueue, 'peekFirstBatch').mockReturnValue(batchMock);

      const batches: TestTransactionsBatch[] = [];
      const iterator = service['batchesIterator']();
      const batch1 = await iterator.next();
      batches.push(batch1.value as TestTransactionsBatch);
      // Simulate confirmation of the first batch
      service['resolveNextBatch']();
      const batch2 = await iterator.next();
      batches.push(batch2.value as TestTransactionsBatch);
      jest.advanceTimersByTime(50);
      expect(batches).toEqual([batchMock, batchMock]);
      expect(mockQueue.peekFirstBatch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });
});
