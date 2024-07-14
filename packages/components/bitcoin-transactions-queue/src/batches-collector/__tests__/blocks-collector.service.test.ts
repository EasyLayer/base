import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BatchesQueueCollectorService } from '../batches-collector.service';
import { TransactionsBatchQueue } from '../../transactions-batch-queue';
import { TransactionsQueueConfig } from '../../config';
import { TransactionsBatch } from '../../interfaces';

jest.mock('@easylayer/logger');
jest.mock('../transactions-batch-queue');

describe('BatchesQueueCollectorService', () => {
  let service: BatchesQueueCollectorService;
  // let log: AppLogger;
  let queue: TransactionsBatchQueue<TransactionsBatch>;
  // let config: TransactionsQueueConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchesQueueCollectorService,
        {
          provide: AppLogger,
          useValue: {
            debug: jest.fn(),
          },
        },
        {
          provide: TransactionsQueueConfig,
          useValue: {
            BITCOIN_TRANSACTIONS_MAX_TRANSACTIONS_PER_BATCH: 10,
          },
        },
      ],
    }).compile();

    service = module.get<BatchesQueueCollectorService>(BatchesQueueCollectorService);
    // log = module.get<AppLogger>(AppLogger);
    // config = module.get<TransactionsQueueConfig>(TransactionsQueueConfig);
    queue = new TransactionsBatchQueue<TransactionsBatch>();
    service.init(queue);
  });

  describe('addBatch', () => {
    it('should return false if batch is invalid', () => {
      jest.spyOn(service as any, 'validateBatch').mockReturnValue(false);
      const batch: TransactionsBatch = {} as TransactionsBatch;
      expect(service.addBatch(batch)).toBe(false);
    });

    it('should enqueue batch if valid', () => {
      jest.spyOn(service as any, 'validateBatch').mockReturnValue(true);
      jest.spyOn(queue, 'enqueue').mockReturnValue(true);
      const batch: TransactionsBatch = {} as TransactionsBatch;
      expect(service.addBatch(batch)).toBe(true);
      expect(queue.enqueue).toHaveBeenCalledWith(batch);
    });

    it('should return false if enqueue fails', () => {
      jest.spyOn(service as any, 'validateBatch').mockReturnValue(true);
      jest.spyOn(queue, 'enqueue').mockReturnValue(false);
      const batch: TransactionsBatch = {} as TransactionsBatch;
      expect(service.addBatch(batch)).toBe(false);
      expect(queue.enqueue).toHaveBeenCalledWith(batch);
    });
  });

  describe('addBlock', () => {
    it('should return false if block is invalid', () => {
      jest.spyOn(service as any, 'validateBlock').mockReturnValue(false);
      const block: any = { height: 2 };
      expect(service.addBlock(block)).toBe(false);
    });

    it('should enqueue all batches if block is valid', () => {
      const block: any = {
        height: 2,
        tx: [1, 2, 3],
        hash: 'hash',
        prevblockhash: 'prevhash',
      };
      jest.spyOn(service as any, 'validateBlock').mockReturnValue(true);
      jest.spyOn(queue, 'enqueue').mockReturnValue(true);
      jest.spyOn(service as any, 'splitBlockIntoBatches').mockReturnValue([block]);

      expect(service.addBlock(block)).toBe(true);
      expect(queue.enqueue).toHaveBeenCalledWith(block);
    });

    it('should return false if enqueue fails for any batch', () => {
      const block: any = {
        height: 2,
        tx: [1, 2, 3],
        hash: 'hash',
        prevblockhash: 'prevhash',
      };
      jest.spyOn(service as any, 'validateBlock').mockReturnValue(true);
      jest.spyOn(queue, 'enqueue').mockReturnValueOnce(true).mockReturnValueOnce(false);
      jest.spyOn(service as any, 'splitBlockIntoBatches').mockReturnValue([block, block]);

      expect(service.addBlock(block)).toBe(false);
    });
  });

  describe('splitBlockIntoBatches', () => {
    it('should split block into multiple batches if tx exceeds max transactions per batch', () => {
      const block: any = {
        tx: Array(15).fill('tx'),
        hash: 'hash',
        height: 2,
        prevblockhash: 'prevhash',
      };
      const batches = service['splitBlockIntoBatches'](block);
      expect(batches.length).toBe(2);
      expect(batches[0].tx.length).toBe(10);
      expect(batches[1].tx.length).toBe(5);
    });

    it('should return a single batch if tx does not exceed max transactions per batch', () => {
      const block: any = {
        tx: Array(5).fill('tx'),
        hash: 'hash',
        height: 2,
        prevblockhash: 'prevhash',
      };
      const batches = service['splitBlockIntoBatches'](block);
      expect(batches.length).toBe(1);
      expect(batches[0].tx.length).toBe(5);
    });
  });

  describe('validateBatch', () => {
    it('should always return true (stub implementation)', () => {
      const batch: TransactionsBatch = {} as TransactionsBatch;
      expect(service['validateBatch'](batch)).toBe(true);
    });
  });

  describe('validateBlock', () => {
    it('should return false if block height is not the next height', () => {
      queue.lastHeight = 1n;
      const block: any = { height: 3 };
      expect(service['validateBlock'](block)).toBe(false);
    });

    it('should return true if block height is the next height', () => {
      queue.lastHeight = 1n;
      const block: any = { height: 2 };
      expect(service['validateBlock'](block)).toBe(true);
    });
  });
});
