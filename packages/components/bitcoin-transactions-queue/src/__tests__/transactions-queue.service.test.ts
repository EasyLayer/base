import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { TransactionsQueueService } from '../transactions-queue.service';
import { TransactionsBatchQueue } from '../transactions-batch-queue';
import { TransactionsBatch } from '../interfaces';
import { BatchesQueueIteratorService } from '../batches-iterator';
import { BatchesQueueLoaderService } from '../batches-loader';
import { BatchesQueueCollectorService } from '../batches-collector';
import { TransactionsQueueConfig } from '../config/transactions-queue.config';

describe('TransactionsQueueService', () => {
  let service: TransactionsQueueService;
  let mockLogger: AppLogger;
  let mockBatchesIterator: jest.Mocked<BatchesQueueIteratorService>;
  let mockBatchCollectorService: jest.Mocked<BatchesQueueCollectorService>;
  let mockBatchesQueueConfig: jest.Mocked<TransactionsQueueConfig>;
  let mockBatchQueue: jest.Mocked<TransactionsBatchQueue<TransactionsBatch>>;
  let mockBatchesQueueLoader: jest.Mocked<BatchesQueueLoaderService>;
  let queueLength: number;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockBatchesIterator = {
      startQueueIterating: jest.fn(),
      resolveNextBatch: jest.fn(),
    } as any;

    mockBatchCollectorService = {
      init: jest.fn(),
    } as any;

    mockBatchesQueueConfig = {
      BITCOIN_TRANSACTIONS_QUEUE_MAX_LENGTH: 5,
    } as any;

    queueLength = 0;

    mockBatchQueue = {
      enqueue: jest.fn(),
      fetchBatchFromOutStack: jest.fn(),
      peekFirstBatch: jest.fn(),
      dequeue: jest.fn(),
      clear: jest.fn(),
      get length() {
        return queueLength;
      },
      set length(value: number) {
        queueLength = value;
      },
      lastHeight: BigInt(0),
    } as any;

    mockBatchesQueueLoader = {
      startTransactionsLoading: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AppLogger, useValue: mockLogger },
        { provide: BatchesQueueIteratorService, useValue: mockBatchesIterator },
        { provide: BatchesQueueCollectorService, useValue: mockBatchCollectorService },
        { provide: TransactionsQueueConfig, useValue: mockBatchesQueueConfig },
        { provide: TransactionsBatchQueue, useValue: mockBatchQueue },
        { provide: BatchesQueueLoaderService, useValue: mockBatchesQueueLoader },
        {
          provide: TransactionsQueueService,
          useFactory: (logger, iterator, loader, config, collector) =>
            new TransactionsQueueService(logger, iterator, loader, config, collector, { maxBlockHeight: BigInt(10) }),
          inject: [
            AppLogger,
            BatchesQueueIteratorService,
            BatchesQueueLoaderService,
            TransactionsQueueConfig,
            BatchesQueueCollectorService,
          ],
        },
      ],
    }).compile();

    service = module.get<TransactionsQueueService>(TransactionsQueueService);
    service['_batchQueue'] = mockBatchQueue;
  });

  describe('reorganizeBatches', () => {
    it('should clear the queue and set a new starting height', async () => {
      jest.spyOn(service['queue'], 'clear');
      jest.spyOn(service['batchesQueueIterator'], 'resolveNextBatch');
      await service.reorganizeBatches(2);
      expect(service['queue'].clear).toHaveBeenCalled();
      expect(service['queue'].lastHeight).toBe(BigInt(2));
      expect(service['batchesQueueIterator'].resolveNextBatch).toHaveBeenCalled();
    });
  });

  describe('confirmIndexBatch', () => {
    it('should confirm and dequeue the batch if the hash matches', async () => {
      const batchMock: TransactionsBatch = {
        blockHeight: BigInt(1),
        blockHash: 'hash 1',
        prevBlockHash: 'prevhash',
        n: 0,
        isFinalBatch: false,
        tx: [],
      };
      Object.defineProperty(service['queue'], 'firstBatch', {
        get: jest.fn(() => batchMock),
      });
      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue').mockImplementation(() => batchMock);
      await service.confirmIndexBatch({ blockHash: 'hash 1', blockHeight: '1', prevBlockHash: 'prevhash', n: 0 });
      expect(service['queue'].firstBatch).toBe(batchMock);
      expect(dequeueSpy).toHaveBeenCalled();
    });

    it('should not dequeue the batch if the hash does not match', async () => {
      const batchMock: TransactionsBatch = {
        blockHeight: BigInt(1),
        blockHash: 'hash 1',
        prevBlockHash: 'prevhash',
        n: 0,
        isFinalBatch: false,
        tx: [],
      };
      Object.defineProperty(service['queue'], 'firstBatch', {
        get: jest.fn(() => batchMock),
      });
      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue').mockImplementation(() => batchMock);
      await service.confirmIndexBatch({ blockHash: 'hash 2', blockHeight: '1', prevBlockHash: 'prevhash', n: 0 });
      expect(service['queue'].firstBatch).toBe(batchMock);
      expect(dequeueSpy).not.toHaveBeenCalled();
    });

    it('should handle the case when no batch is found', async () => {
      Object.defineProperty(service['queue'], 'firstBatch', {
        get: jest.fn(() => undefined),
      });
      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue');
      await service.confirmIndexBatch({ blockHash: 'hash 1', blockHeight: '1', prevBlockHash: 'prevhash', n: 0 });
      expect(service['queue'].firstBatch).toBeUndefined();
      expect(dequeueSpy).not.toHaveBeenCalled();
    });
  });
});
