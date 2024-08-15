import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/core/bitcoin-network-provider';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueueService } from '../blocks-queue.service';
import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';
import { BlocksQueueIteratorService } from '../blocks-iterator';
import { BlocksQueueLoaderService } from '../blocks-loader';
import { BlocksQueueCollectorService } from '../blocks-collector';

describe('BlocksQueueService', () => {
  let service: BlocksQueueService;
  let mockLogger: AppLogger;
  let mockNetworkProviderService: jest.Mocked<BitcoinNetworkProviderService>;
  let mockWebhookStreamService: jest.Mocked<BitcoinWebhookStreamService>;
  let mockBlocksIterator: jest.Mocked<BlocksQueueIteratorService>;
  let mockBlockCollectorService: jest.Mocked<BlocksQueueCollectorService>;
  let mockBlockQueue: jest.Mocked<BlocksQueue<Block>>;
  let queueLength: number;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockNetworkProviderService = {
      getCurrentBlockHeight: jest.fn(),
    } as any;

    mockWebhookStreamService = {
      createStream: jest.fn(),
      handleStream: jest.fn(),
    } as any;

    mockBlocksIterator = {
      startQueueIterating: jest.fn(),
      resolveNextBatch: jest.fn(),
    } as any;

    mockBlockCollectorService = {
      init: jest.fn(),
    } as any;

    queueLength = 0;

    mockBlockQueue = {
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
      lastHeight: 0,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AppLogger, useValue: mockLogger },
        { provide: BitcoinNetworkProviderService, useValue: mockNetworkProviderService },
        { provide: BitcoinWebhookStreamService, useValue: mockWebhookStreamService },
        {
          provide: BlocksQueueIteratorService,
          useValue: mockBlocksIterator,
        },
        {
          provide: BlocksQueueLoaderService,
          useFactory: (logger, networkProvider, webhookStreamService) =>
            new BlocksQueueLoaderService(logger, networkProvider, webhookStreamService, {
              isTransportMode: false,
            }),
          inject: [AppLogger, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
        {
          provide: BlocksQueueCollectorService,
          useValue: mockBlockCollectorService,
        },
        {
          provide: BlocksQueueService,
          useFactory: (logger, iterator, loader, collector) =>
            new BlocksQueueService(logger, iterator, loader, collector, { maxBlockHeight: 10 }),
          inject: [AppLogger, BlocksQueueIteratorService, BlocksQueueLoaderService, BlocksQueueCollectorService],
        },
        { provide: BlocksQueue, useValue: mockBlockQueue },
      ],
    }).compile();

    service = module.get<BlocksQueueService>(BlocksQueueService);
    service['_blockQueue'] = mockBlockQueue;
  });

  describe('start', () => {
    it('should start blocks loading and queue iterating', () => {
      service.start(100);

      expect(mockBlocksIterator.startQueueIterating).toHaveBeenCalledWith(mockBlockQueue);
    });
  });

  describe('reorganizeBlocks', () => {
    it('should clear the queue and set a new starting height', async () => {
      jest.spyOn(service['queue'], 'clear');

      await service.reorganizeBlocks(2);

      expect(service['queue'].clear).toHaveBeenCalled();
      expect(service['queue'].lastHeight).toBe(2);
      expect(service['blocksQueueIterator'].resolveNextBatch).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Queue was clear to height: ',
        { newStartHeight: 2 },
        'BlocksQueueService'
      );
    });
  });

  describe('confirmIndexBatch', () => {
    it('should throw an error if block hash does not match', async () => {
      const blockMock = { hash: 'wrong-hash', height: 0, tx: [] } as Block;
      mockBlockQueue.peekFirstBlock.mockReturnValueOnce(blockMock);

      await expect(service.confirmIndexBatch(['test-hash'])).rejects.toThrow(
        'Block not found or hash mismatch: test-hash'
      );
    });
  });

  describe('queue', () => {
    it('should return the block queue', () => {
      expect(service.queue).toBe(mockBlockQueue);
    });
  });

  describe('blocksCollector', () => {
    it('should return the block collector service', () => {
      expect(service.blocksCollector).toBe(mockBlockCollectorService);
    });
  });
});
