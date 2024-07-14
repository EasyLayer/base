import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { TransactionsBatchQueue } from '../../transactions-batch-queue';
import { TransactionsBatch, Block } from '../../interfaces';
import { TransactionsQueueConfig } from '../../config';
import { BatchesQueueCollectorService } from '../../batches-collector';

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

class TestBlock implements Block {
  height: bigint;
  hash: string;
  prevblockhash: string | null;
  tx: any[];

  constructor(height: bigint, hash: string, prevblockhash: string | null, tx: any[]) {
    this.height = height;
    this.hash = hash;
    this.prevblockhash = prevblockhash;
    this.tx = tx;
  }
}

describe('BatchesQueueCollectorService', () => {
  let service: BatchesQueueCollectorService;
  let mockLogger: AppLogger;
  let mockQueue: TransactionsBatchQueue<TestTransactionsBatch>;
  let mockConfig: TransactionsQueueConfig;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockQueue = new TransactionsBatchQueue<TestTransactionsBatch>();
    mockConfig = {
      BITCOIN_TRANSACTIONS_QUEUE_MAX_TRANSACTIONS_PER_BATCH: 2,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        {
          provide: TransactionsQueueConfig,
          useValue: mockConfig,
        },
        BatchesQueueCollectorService,
      ],
    }).compile();

    service = module.get<BatchesQueueCollectorService>(BatchesQueueCollectorService);
    service.init(mockQueue);
  });

  describe('addBatch', () => {
    it('should add a valid batch to the queue', () => {
      const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
      const result = service.addBatch(batch);
      expect(result).toBe(true);
      expect(mockQueue.length).toBe(1);
    });

    it('should not add an invalid batch to the queue', () => {
      jest.spyOn(service as any, 'validateBatch').mockReturnValue(false);
      const batch = new TestTransactionsBatch(1n, 'hash1', 'prevHash1', 0);
      const result = service.addBatch(batch);
      expect(result).toBe(false);
      expect(mockQueue.length).toBe(0);
    });
  });

  describe('addBlock', () => {
    it('should add a valid block to the queue', () => {
      const block = new TestBlock(0n, 'hash1', null, ['tx1', 'tx2']);
      const result = service.addBlock(block);
      expect(result).toBe(true);
      expect(mockQueue.length).toBe(1);
    });

    it('should split a block into multiple batches and add them to the queue', () => {
      const block = new TestBlock(0n, 'hash1', null, ['tx1', 'tx2', 'tx3']);
      const result = service.addBlock(block);
      expect(result).toBe(true);
      expect(mockQueue.length).toBe(2);
    });

    it('should not add an invalid block to the queue', () => {
      jest.spyOn(service as any, 'validateBlock').mockReturnValue(false);
      const block = new TestBlock(1n, 'hash1', 'prevHash1', ['tx1', 'tx2']);
      const result = service.addBlock(block);
      expect(result).toBe(false);
      expect(mockQueue.length).toBe(0);
    });
  });

  describe('splitBlockIntoBatches', () => {
    it('should split a block into batches based on max transactions per batch', () => {
      const block = new TestBlock(0n, 'hash1', null, ['tx1', 'tx2', 'tx3']);
      const batches = service['splitBlockIntoBatches'](block);
      expect(batches.length).toBe(2);
      expect(batches[0].tx.length).toBe(2);
      expect(batches[1].tx.length).toBe(1);
    });

    it('should create a single batch if transactions fit within max limit', () => {
      const block = new TestBlock(0n, 'hash1', null, ['tx1', 'tx2']);
      const batches = service['splitBlockIntoBatches'](block);
      expect(batches.length).toBe(1);
      expect(batches[0].tx.length).toBe(2);
    });
  });

  describe('enqueueBatch', () => {
    it('should enqueue a valid batch', () => {
      const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
      const result = service['enqueueBatch'](batch);
      expect(result).toBe(true);
      expect(mockQueue.length).toBe(1);
    });

    it('should not enqueue an invalid batch', () => {
      jest.spyOn(mockQueue, 'enqueue').mockReturnValue(false);
      const batch = new TestTransactionsBatch(0n, 'hash1', null, 0);
      const result = service['enqueueBatch'](batch);
      expect(result).toBe(false);
      expect(mockQueue.length).toBe(0);
    });
  });

  // describe('validateBatch', () => {
  // });

  // describe('validateBlock', () => {
  // });
});
