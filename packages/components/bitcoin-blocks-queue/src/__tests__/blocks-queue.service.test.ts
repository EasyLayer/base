import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BlocksQueueService } from '../blocks-queue.service';
import { BlocksQueue } from '../blocks-queue';
import { Block } from '../interfaces';
import { BlocksQueueIteratorService } from '../blocks-iterator';
import { BlocksQueueLoaderService } from '../blocks-loader';
import { BlocksQueueCollectorService } from '../blocks-collector';
import { BlocksQueueConfig } from '../config/blocks-queue.config';

describe('BlocksQueueService', () => {
  let service: BlocksQueueService;
  let mockLogger: AppLogger;
  let mockNetworkProviderService: jest.Mocked<BitcoinNetworkProviderService>;
  let mockWebhookStreamService: jest.Mocked<BitcoinWebhookStreamService>;
  let mockBlocksIterator: jest.Mocked<BlocksQueueIteratorService>;
  let mockBlockCollectorService: jest.Mocked<BlocksQueueCollectorService>;
  let mockBlocksQueueConfig: jest.Mocked<BlocksQueueConfig>;
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
      resolveNextBlock: jest.fn(),
    } as any;

    mockBlockCollectorService = {
      init: jest.fn(),
    } as any;

    mockBlocksQueueConfig = {
      BITCOIN_BLOCKS_QUEUE_MAX_LENGTH: 5,
      BITCOIN_BLOCKS_QUEUE_MAX_BLOCK_HEIGHT: 10,
      isAllowStreamLoad: () => false,
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
          useFactory: (logger, blocksQueueConfig, networkProvider, webhookStreamService) =>
            new BlocksQueueLoaderService(logger, blocksQueueConfig, networkProvider, webhookStreamService, {
              isTransportMode: false,
            }),
          inject: [AppLogger, BlocksQueueConfig, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
        {
          provide: BlocksQueueCollectorService,
          useValue: mockBlockCollectorService,
        },
        {
          provide: BlocksQueueConfig,
          useValue: mockBlocksQueueConfig,
        },
        {
          provide: BlocksQueueService,
          useFactory: (logger, iterator, loader, config, collector) =>
            new BlocksQueueService(logger, iterator, loader, config, collector, { maxBlockHeight: 10 }),
          inject: [
            AppLogger,
            BlocksQueueIteratorService,
            BlocksQueueLoaderService,
            BlocksQueueConfig,
            BlocksQueueCollectorService,
          ],
        },
        { provide: BlocksQueue, useValue: mockBlockQueue },
      ],
    }).compile();

    service = module.get<BlocksQueueService>(BlocksQueueService);
    service['_blockQueue'] = mockBlockQueue;
  });

  describe('reorganizeBlocks', () => {
    it('should clear the queue and set a new starting height', async () => {
      jest.spyOn(service['queue'], 'clear');
      jest.spyOn(service['blocksQueueIterator'], 'resolveNextBlock');

      await service.reorganizeBlocks(2);

      expect(service['queue'].clear).toHaveBeenCalled();
      expect(service['queue'].lastHeight).toBe(2);
      expect(service['blocksQueueIterator'].resolveNextBlock).toHaveBeenCalled();
    });
  });

  describe('confirmIndexBlock', () => {
    it('should confirm and dequeue the block if the hash matches', async () => {
      const blockMock: Block = { height: 1, hash: 'hash 1', tx: [] };

      Object.defineProperty(service['queue'], 'firstBlock', {
        get: jest.fn(() => blockMock),
      });

      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue').mockImplementation(() => blockMock);

      await service.confirmIndexBlock('hash 1');

      expect(service['queue'].firstBlock).toBe(blockMock);
      expect(dequeueSpy).toHaveBeenCalled();
    });

    it('should not dequeue the block if the hash does not match', async () => {
      const blockMock: Block = { height: 1, hash: 'hash 1', tx: [] };

      Object.defineProperty(service['queue'], 'firstBlock', {
        get: jest.fn(() => blockMock),
      });

      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue').mockImplementation(() => blockMock);

      await service.confirmIndexBlock('hash 2');

      expect(service['queue'].firstBlock).toBe(blockMock);
      expect(dequeueSpy).not.toHaveBeenCalled();
    });

    it('should handle the case when no block is found', async () => {
      Object.defineProperty(service['queue'], 'firstBlock', {
        get: jest.fn(() => undefined),
      });

      const dequeueSpy = jest.spyOn(service['queue'], 'dequeue');

      await service.confirmIndexBlock('hash 1');

      expect(service['queue'].firstBlock).toBeUndefined();
      expect(dequeueSpy).not.toHaveBeenCalled();
    });
  });
});
