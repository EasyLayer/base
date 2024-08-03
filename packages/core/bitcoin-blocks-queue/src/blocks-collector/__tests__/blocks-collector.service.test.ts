import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueueCollectorService } from '../blocks-collector.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block } from '../../interfaces';
import { TransactionsBatchesCollector } from '../collectors-templates';

class TestBlock implements Block {
  height: number;
  hash: string;
  tx: any[];

  constructor(height: number, hash?: string) {
    this.height = height;
    this.hash = hash || '';
    this.tx = [];
  }
}

describe('BlocksQueueCollectorService', () => {
  let service: BlocksQueueCollectorService;
  let mockLogger: AppLogger;
  let mockQueue: BlocksQueue<TestBlock>;
  let mockTransactionsCollector: TransactionsBatchesCollector;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockQueue = {
      enqueue: jest.fn(),
      lastHeight: 0,
    } as any;

    mockTransactionsCollector = {
      setExpectedTransactionCount: jest.fn(),
      add: jest.fn(),
      isComplete: jest.fn(),
      collectAllTransactions: jest.fn(),
      reset: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksQueueCollectorService,
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<BlocksQueueCollectorService>(BlocksQueueCollectorService);
    service.init(mockQueue);
    service['createStrategy'] = jest.fn().mockImplementation(() => {
      service['_transactionsCollector'] = mockTransactionsCollector;
    });
    service['createStrategy']('batches');
  });

  describe('Initialization', () => {
    it('should initialize with the default strategy', () => {
      expect(service['_transactionsCollector']).toBe(mockTransactionsCollector);
    });

    it('should initialize the queue', () => {
      expect(service['_queue']).toBe(mockQueue);
    });
  });

  describe('addBlock', () => {
    it('should add a block if height is correct and no block is currently being processed', () => {
      const blockMock = new TestBlock(1);
      service.addBlock(blockMock, 10);

      expect(service['_block']).toBe(blockMock);
      expect(mockTransactionsCollector.setExpectedTransactionCount).toHaveBeenCalledWith(10);

      if (blockMock.tx.length === 10) {
        expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
      }
    });

    it('should reset if the block height is less than the last height in the queue', () => {
      const blockMock = new TestBlock(0);
      mockQueue.lastHeight = 1;

      service.addBlock(blockMock, 10);

      expect(service['_block']).toBeNull();
      expect(mockTransactionsCollector.reset).toHaveBeenCalled();
    });

    it('should not add a block if height is not +1 from the last height in the queue', () => {
      const blockMock = new TestBlock(2);
      mockQueue.lastHeight = 4;

      service.addBlock(blockMock, 10);

      expect(service['_block']).toBeNull();
      expect(mockTransactionsCollector.reset).toHaveBeenCalled();
    });

    it('should reset if a block is already in progress and its height is less than the last height in the queue', () => {
      const blockMock1 = new TestBlock(0);
      service.addBlock(blockMock1, 10);

      const blockMock2 = new TestBlock(1);
      mockQueue.lastHeight = 3;
      service.addBlock(blockMock2, 10);

      expect(service['_block']).toBeNull();
      expect(mockTransactionsCollector.reset).toHaveBeenCalled();
    });

    it('should collect block immediately if all transactions are present', async () => {
      const blockMock = new TestBlock(1);
      blockMock.tx = [{}, {}];
      service.addBlock(blockMock, 2);

      await service['collect']();
      expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
    });
  });

  describe('addTransactions', () => {
    it('should add transactions to the collector', () => {
      const blockMock = new TestBlock(1, 'hash1');
      service.addBlock(blockMock, 10);
      const transactionsData = { tx: [{}], blockHash: 'hash1', blockHeight: 1 };
      service.addTransactions(transactionsData);

      expect(mockTransactionsCollector.add).toHaveBeenCalledWith({ hash: 'hash1', height: 1 }, transactionsData);
    });

    it('should collect block if all transactions are received', async () => {
      const blockMock = new TestBlock(1);
      service.addBlock(blockMock, 1);
      const transactionsData = { tx: [{}], blockHash: 'hash1', blockHeight: 1 };
      mockTransactionsCollector.isComplete = jest.fn().mockReturnValue(true);

      service.addTransactions(transactionsData);

      service['collect']();
      expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
    });
  });

  describe('collect', () => {
    it('should reset if the block height is not +1 from the last height in the queue', () => {
      const blockMock = new TestBlock(2);
      service['_block'] = blockMock;
      service['collect']();

      expect(service['_block']).toBeNull();
      expect(mockTransactionsCollector.reset).toHaveBeenCalled();
    });

    it('should not reset if the block cannot be enqueued', () => {
      const blockMock = new TestBlock(1);
      mockQueue.lastHeight = 0;
      service['_block'] = blockMock;
      mockQueue.enqueue = jest.fn().mockReturnValue(false);
      mockTransactionsCollector.collectAllTransactions = jest.fn().mockReturnValue([{}]);

      service['collect']();

      expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
      expect(service['_block']).toBe(blockMock);
    });
  });

  describe('reset', () => {
    it('should reset the current block and transactions collector', () => {
      service['reset']();

      expect(service['_block']).toBeNull();
      expect(mockTransactionsCollector.reset).toHaveBeenCalled();
    });
  });
});
