import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { exponentialIntervalAsync } from '@easylayer/exponential-interval-async';
import { BlocksQueueLoaderService } from '../blocks-loader.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block } from '../../interfaces';
import { BlocksQueueConfig } from '../../config/blocks-queue.config';
import { StrategyNames } from '../load-strategies';

jest.mock('@easylayer/exponential-interval-async');

describe('BlocksQueueLoaderService', () => {
  let service: BlocksQueueLoaderService;
  let mockLogger: AppLogger;
  let mockNetworkProviderService: jest.Mocked<BitcoinNetworkProviderService>;
  let mockWebhookStreamService: jest.Mocked<BitcoinWebhookStreamService>;
  let mockBlocksQueueConfig: jest.Mocked<BlocksQueueConfig>;
  let mockQueue: jest.Mocked<BlocksQueue<Block>>;
  let options: any;

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
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any;

    mockBlocksQueueConfig = {
      BITCOIN_BLOCKS_QUEUE_MAX_LENGTH: 5,
      BITCOIN_BLOCKS_QUEUE_MAX_BLOCK_HEIGHT: 10,
    } as any;

    mockQueue = {
      enqueue: jest.fn(),
      fetchBlockFromOutStack: jest.fn(),
      peekFirstBlock: jest.fn(),
      dequeue: jest.fn(),
      clear: jest.fn(),
      get length() {
        return 0;
      },
      set length(value: number) {},
      lastHeight: 0,
    } as any;

    options = { isTransportMode: false, maxBlockHeight: 10 };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        {
          provide: BitcoinNetworkProviderService,
          useValue: mockNetworkProviderService,
        },
        {
          provide: BitcoinWebhookStreamService,
          useValue: mockWebhookStreamService,
        },
        {
          provide: BlocksQueueConfig,
          useValue: mockBlocksQueueConfig,
        },
        {
          provide: BlocksQueueLoaderService,
          useFactory: (logger, blocksQueueConfig, networkProviderService, webhookStreamService) =>
            new BlocksQueueLoaderService(
              logger,
              blocksQueueConfig,
              networkProviderService,
              webhookStreamService,
              options
            ),
          inject: [AppLogger, BlocksQueueConfig, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
      ],
    }).compile();

    service = module.get<BlocksQueueLoaderService>(BlocksQueueLoaderService);
    service['_queue'] = mockQueue;
  });

  describe('startBlocksLoading', () => {
    it('should not start loading if already loading', async () => {
      jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
      jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());

      await service.startBlocksLoading(0, mockQueue);
      await service.startBlocksLoading(0, mockQueue);

      expect(exponentialIntervalAsync).toHaveBeenCalledTimes(1);
    });

    it('should set queue and start loading', async () => {
      jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
      jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());

      await service.startBlocksLoading(0, mockQueue);
      expect(service['isLoading']).toBe(true);
      expect(service['_queue']).toBe(mockQueue);
      expect(service['_queue'].lastHeight).toBe(0);
      expect(exponentialIntervalAsync).toHaveBeenCalled();
    });
  });

  describe('handleBlockFromStream', () => {
    it('should add block to queue', async () => {
      const blockMock: Block = { height: 1, hash: 'hash 1', tx: [] };
      await service.handleBlockFromStream(blockMock);
      expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
    });

    it('should destroy strategy if enqueue fails in webhook stream strategy', async () => {
      service['_loadingStrategy'] = {
        name: StrategyNames.WEBHOOK_STREAM,
        isLoading: false,
        destroy: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(undefined),
      };

      const blockMock: Block = { height: 1, hash: 'hash 1', tx: [] };
      mockQueue.enqueue.mockReturnValue(false); // Simulate enqueue failure

      await service.handleBlockFromStream(blockMock);

      expect(service['_loadingStrategy'].destroy).toHaveBeenCalled();
    });
  });

  describe('destroyStrategy', () => {
    it('should destroy the current strategy and set it to null', async () => {
      jest.useFakeTimers();
      const mockDestroy = jest.fn().mockResolvedValue(undefined);

      service['_loadingStrategy'] = {
        name: StrategyNames.WEBHOOK_STREAM,
        isLoading: false,
        destroy: mockDestroy,
        load: jest.fn().mockResolvedValue(undefined),
      };

      await service.destroyStrategy();

      expect(mockDestroy).toHaveBeenCalled();
      expect(service['_loadingStrategy']).toBeNull();
      jest.useRealTimers();
    });
  });
});
