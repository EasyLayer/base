import { Test, TestingModule } from '@nestjs/testing';
import Piscina from 'piscina';
import { BlocksQueueService } from '../blocks-queue.service';
import { AppLogger } from '@easylayer/logger';
import { ConnectionManager } from '@easylayer/bitcoin-network-provider';
import { SystemConfig } from '../../../config';
import { BlocksCommandFactoryService } from '../../services/blocks-command-factory.service';
import { Block } from '../interfaces';
import { BlocksQueue } from '../blocks-queue';

jest.mock('piscina');

describe('BlocksQueueService', () => {
  let service: BlocksQueueService;
  let mockLogger: AppLogger;
  let mockSystemConfig: jest.Mocked<SystemConfig>;
  let mockBlocksCommandFactory: jest.Mocked<BlocksCommandFactoryService>;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockBlocksQueue: jest.Mocked<BlocksQueue<Block>>;
  let mockPiscina: jest.Mocked<Piscina>;
  let queueLength: number;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockSystemConfig = {
      BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM: 2,
      BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE: 5,
      isTEST: () => false,
    } as any;

    mockBlocksCommandFactory = {
      indexBlock: jest.fn(),
    } as any;

    mockConnectionManager = {
      connectionOptionsForAllProviders: jest.fn(),
    } as any;

    queueLength = 0;

    mockBlocksQueue = {
      enqueue: jest.fn(),
      fetchBlockFromOutStack: jest.fn(),
      peekFirstBlock: jest.fn(),
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

    mockPiscina = new (Piscina as any)({ filename: '' });
    mockPiscina.run = jest.fn().mockResolvedValue({ height: BigInt(1), hash: 'hash 1', tx: [] });
    Object.defineProperty(mockPiscina, 'options', {
      value: {
        maxThreads: 2,
      },
      writable: false,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksQueueService,
        { provide: AppLogger, useValue: mockLogger },
        { provide: SystemConfig, useValue: mockSystemConfig },
        { provide: BlocksCommandFactoryService, useValue: mockBlocksCommandFactory },
        { provide: ConnectionManager, useValue: mockConnectionManager },
        { provide: BlocksQueue, useValue: mockBlocksQueue },
        { provide: Piscina, useValue: mockPiscina },
      ],
    }).compile();

    service = module.get<BlocksQueueService>(BlocksQueueService);
    service['blockQueue'] = mockBlocksQueue;
    service['workerPool'] = mockPiscina as any;
  });

  describe('blocksIterator', () => {
    it('should yield blocks when they are available in the queue', async () => {
      const blockMock1: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      const blockMock2: Block = { height: BigInt(2), hash: 'hash 2', tx: [] };
      jest
        .spyOn(service['blockQueue'], 'peekFirstBlock')
        .mockResolvedValueOnce(blockMock1)
        .mockResolvedValueOnce(blockMock2)
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'peekFirstBlock')
        .mockResolvedValueOnce(blockMock1)
        .mockResolvedValueOnce(blockMock2)
        .mockResolvedValue(undefined);
      jest.spyOn(service['blockQueue'], 'length', 'get').mockReturnValue(2);

      const blocks = [];
      for await (const block of service['blocksIterator']()) {
        blocks.push(block);
        if (blocks.length === 2) break; // exit after collecting two blocks
      }

      expect(blocks).toEqual([blockMock1, blockMock2]);
    });

    it('should wait for blockProcessedPromise before yielding the next block', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      const blockProcessedPromise = new Promise<void>((resolve) => setTimeout(resolve, 50));
      service['blockProcessedPromise'] = blockProcessedPromise;

      jest.spyOn(service['blockQueue'], 'peekFirstBlock').mockResolvedValue(blockMock);
      jest.spyOn(service['blockQueue'], 'length', 'get').mockReturnValue(1);

      const blocks = [];
      const iterator = service['blocksIterator']();
      const block1 = await iterator.next();
      blocks.push(block1.value);

      // Simulate confirmation of the first block
      service['resolveNextBlock']();

      const block2 = await iterator.next();
      blocks.push(block2.value);

      expect(blocks).toEqual([blockMock, blockMock]);
      expect(service['blockQueue'].peekFirstBlock).toHaveBeenCalledTimes(2);
    });
  });

  describe('startQueueIteratting', () => {
    it('should process blocks and call indexBlock', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service as any, 'blocksIterator').mockReturnValue(
        (async function* () {
          yield blockMock;
        })()
      );
      const indexBlockSpy = jest.spyOn(service['blocksCommandFactory'], 'indexBlock').mockResolvedValue(undefined);

      await service['startQueueIteratting']();

      expect(indexBlockSpy).toHaveBeenCalledWith({ block: blockMock, requestId: expect.any(String) });
    });

    it('should wait for block to be confirmed before processing the next block', async () => {
      const blockMock1: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      const blockMock2: Block = { height: BigInt(2), hash: 'hash 2', tx: [] };

      const blocksIteratorSpy = jest.spyOn(service as any, 'blocksIterator').mockReturnValue(
        (async function* () {
          yield blockMock1;
          yield blockMock2;
        })()
      );

      const indexBlockSpy = jest.spyOn(service['blocksCommandFactory'], 'indexBlock').mockResolvedValue(undefined);
      const confirmIndexBlockSpy = jest.spyOn(service, 'confirmIndexBlock').mockResolvedValue(undefined);

      service['blockProcessedPromise'] = new Promise<void>((resolve) => {
        service['resolveNextBlock'] = resolve;
      });

      const startIteratingPromise = service['startQueueIteratting']();

      await service.confirmIndexBlock('hash 1');
      await service.confirmIndexBlock('hash 2');

      await startIteratingPromise;

      expect(blocksIteratorSpy).toHaveBeenCalled();
      expect(indexBlockSpy).toHaveBeenCalledWith({ block: blockMock1, requestId: expect.any(String) });
      expect(indexBlockSpy).toHaveBeenCalledWith({ block: blockMock2, requestId: expect.any(String) });
      expect(confirmIndexBlockSpy).toHaveBeenCalledTimes(2);
      expect(confirmIndexBlockSpy).toHaveBeenNthCalledWith(1, 'hash 1');
      expect(confirmIndexBlockSpy).toHaveBeenNthCalledWith(2, 'hash 2');
    });
  });

  describe('loading', () => {
    it('should stop loading when the queue is full', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service as any, 'loadBlockWithRetry').mockResolvedValue(blockMock);
      jest.spyOn(service['blockQueue'], 'enqueue').mockImplementation(() => {
        if (queueLength >= mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE) {
          return false;
        }
        queueLength++;
        return true;
      });

      queueLength = mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE;

      await service['loading']();

      expect(service['blockQueue'].enqueue).toHaveBeenCalledTimes(0);
    });

    it('should load blocks and enqueue them when the queue is not full', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service as any, 'loadBlockWithRetry').mockResolvedValue(blockMock);
      jest.spyOn(service['blockQueue'], 'enqueue').mockImplementation(() => {
        queueLength++;
        return true;
      });

      await service['loading']();

      expect(service['blockQueue'].enqueue).toHaveBeenCalledWith(blockMock);
      expect(queueLength).toBeGreaterThan(0);
    });

    it('should continue loading blocks until the queue is full', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service as any, 'loadBlockWithRetry').mockResolvedValue(blockMock);
      jest.spyOn(service['blockQueue'], 'enqueue').mockImplementation(() => {
        if (queueLength >= mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE) {
          return false;
        }
        queueLength++;
        return true;
      });

      await service['loading']();

      expect(service['blockQueue'].enqueue).toHaveBeenCalledTimes(
        mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE + 1
      );
    });

    it('should call loadBlockWithRetry the correct number of times', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      const loadBlockWithRetrySpy = jest.spyOn(service as any, 'loadBlockWithRetry').mockResolvedValue(blockMock);
      jest.spyOn(service['blockQueue'], 'enqueue').mockImplementation(() => {
        if (queueLength >= mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE) {
          return false;
        }
        queueLength++;
        return true;
      });

      await service['loading']();

      expect(loadBlockWithRetrySpy).toHaveBeenCalledTimes(mockSystemConfig.BITCOIN_INDEXER_BLOCKS_QUEUE_MAX_SIZE + 1);
    });
  });

  describe('enqueueBlocksBatch', () => {
    it('should enqueue a sorted batch of blocks', () => {
      const blocksBatch: Block[] = [
        { height: BigInt(2), hash: 'hash 2', tx: [] },
        { height: BigInt(1), hash: 'hash 1', tx: [] },
      ];
      jest.spyOn(service['blockQueue'], 'enqueue').mockReturnValue(true);

      const result = service['enqueueBlocksBatch'](blocksBatch);

      expect(result).toBe(true);
      expect(service['blockQueue'].enqueue).toHaveBeenNthCalledWith(1, { height: BigInt(1), hash: 'hash 1', tx: [] });
      expect(service['blockQueue'].enqueue).toHaveBeenNthCalledWith(2, { height: BigInt(2), hash: 'hash 2', tx: [] });
    });

    it('should return false if enqueue fails', () => {
      const blocksBatch: Block[] = [
        { height: BigInt(1), hash: 'hash 1', tx: [] },
        { height: BigInt(2), hash: 'hash 2', tx: [] },
      ];
      jest.spyOn(service['blockQueue'], 'enqueue').mockReturnValueOnce(true).mockReturnValueOnce(false);

      const result = service['enqueueBlocksBatch'](blocksBatch);

      expect(result).toBe(false);
      expect(service['blockQueue'].enqueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadBlockWithRetry', () => {
    it('should load block successfully without retries', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service as any, 'loadBlock').mockResolvedValue(blockMock);

      const result = await service['loadBlockWithRetry'](BigInt(1));

      expect(result).toBe(blockMock);
      expect(service['loadBlock']).toHaveBeenCalledTimes(1);
    });

    it('should retry loading block on failure', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest
        .spyOn(service as any, 'loadBlock')
        .mockRejectedValueOnce(new Error('mock error'))
        .mockResolvedValue(blockMock);

      const result = await service['loadBlockWithRetry'](BigInt(1));

      expect(result).toBe(blockMock);
      expect(service['loadBlock']).toHaveBeenCalledTimes(2);
    });

    it('should throw an error after max retries', async () => {
      jest.spyOn(service as any, 'loadBlock').mockRejectedValue(new Error('mock error'));

      await expect(service['loadBlockWithRetry'](BigInt(1))).rejects.toThrow(
        'Failed to load block at height 1 after 3 attempts: Error: mock error'
      );
      expect(service['loadBlock']).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadBlock', () => {
    it('should load block using worker pool', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service['workerPool'], 'run').mockResolvedValue(blockMock);

      const result = await service['loadBlock'](BigInt(1));

      expect(result).toBe(blockMock);
      expect(service['workerPool'].run).toHaveBeenCalledWith({
        height: BigInt(1),
        providersConnectionOptions: undefined,
      });
    });
  });

  describe('getOneBlockByHeight', () => {
    it('should return the block if it is found in the queue', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(service['blockQueue'], 'fetchBlockFromOutStack').mockReturnValue(blockMock);

      const result = await service.getOneBlockByHeight(1);

      expect(result).toBe(blockMock);
      expect(service['blockQueue'].fetchBlockFromOutStack).toHaveBeenCalledWith(BigInt(1));
    });

    it('should throw an error if the block is not found', async () => {
      jest.spyOn(service['blockQueue'], 'fetchBlockFromOutStack').mockReturnValue(undefined);

      await expect(service.getOneBlockByHeight(1)).rejects.toThrow();
      expect(service['blockQueue'].fetchBlockFromOutStack).toHaveBeenCalledWith(BigInt(1));
    });
  });

  describe('startBlocksLoading', () => {
    it('should not start loading blocks if already started', async () => {
      service['_isLoading'] = true;

      // const startBlocksLoadingSpy = jest.spyOn(service as any, 'startBlocksLoading').mockImplementation(() => {});
      const loadingSpy = jest.spyOn(service as any, 'loading').mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const startQueueIterattingSpy = jest.spyOn(service as any, 'startQueueIteratting').mockImplementation(() => {});

      await service.runQueue(1n);

      // expect(startBlocksLoadingSpy).not.toHaveBeenCalled();
      expect(loadingSpy).not.toHaveBeenCalled();
    });
  });

  describe('reorganizeBlocks', () => {
    it('should clear the queue and set a new starting height', async () => {
      jest.spyOn(service['blockQueue'], 'clear');
      jest.spyOn(service as any, 'initBlockProcessedPromise');

      await service.reorganizeBlocks(2);

      expect(service['blockQueue'].clear).toHaveBeenCalled();
      expect(service['blockQueue'].lastHeight).toBe(BigInt(2));
      // expect(service['initBlockProcessedPromise']).toHaveBeenCalled();
    });
  });

  describe('confirmIndexBlock', () => {
    it('should confirm and dequeue the block if the hash matches', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };

      Object.defineProperty(service['blockQueue'], 'firstBlock', {
        get: jest.fn(() => blockMock),
      });

      const dequeueSpy = jest.spyOn(service['blockQueue'], 'dequeue').mockImplementation(() => blockMock);

      await service.confirmIndexBlock('hash 1');

      expect(service['blockQueue'].firstBlock).toBe(blockMock);
      expect(dequeueSpy).toHaveBeenCalled();
    });

    it('should not dequeue the block if the hash does not match', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };

      Object.defineProperty(service['blockQueue'], 'firstBlock', {
        get: jest.fn(() => blockMock),
      });

      const dequeueSpy = jest.spyOn(service['blockQueue'], 'dequeue').mockImplementation(() => blockMock);

      await service.confirmIndexBlock('hash 2');

      expect(service['blockQueue'].firstBlock).toBe(blockMock);
      expect(dequeueSpy).not.toHaveBeenCalled();
    });

    it('should handle the case when no block is found', async () => {
      Object.defineProperty(service['blockQueue'], 'firstBlock', {
        get: jest.fn(() => undefined),
      });

      const dequeueSpy = jest.spyOn(service['blockQueue'], 'dequeue');

      await service.confirmIndexBlock('hash 1');

      expect(service['blockQueue'].firstBlock).toBeUndefined();
      expect(dequeueSpy).not.toHaveBeenCalled();
    });
  });
});
