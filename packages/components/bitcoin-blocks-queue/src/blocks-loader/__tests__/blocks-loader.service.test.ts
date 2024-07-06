import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BlocksQueueLoaderService } from '../blocks-loader.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block } from '../../interfaces';
import { BlocksQueueConfig } from '../../config/blocks-queue.config';
import { StrategyNames } from '../load-strategies';
import { backOff } from 'exponential-backoff';

jest.mock('exponential-backoff', () => ({
  backOff: jest.fn(),
}));

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
      BITCOIN_BLOCKS_QUEUE_MAX_BLOCK_HEIGHT: 10n,
      isAllowStreamLoad: jest.fn().mockReturnValue(true),
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
      lastHeight: BigInt(0),
    } as any;

    options = { isTransportMode: false, maxBlockHeight: BigInt(10) };

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

      expect(backOff).toHaveBeenCalledTimes(1);
    });

    it('should set queue and start loading', async () => {
      jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
      jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());

      await service.startBlocksLoading(0, mockQueue);
      expect(service['isLoading']).toBe(true);
      expect(service['_queue']).toBe(mockQueue);
      expect(service['_queue'].lastHeight).toBe(BigInt(0));
      expect(backOff).toHaveBeenCalled();
    });
  });

  describe('addBlockToQueue', () => {
    it('should add block to queue', async () => {
      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      await service.addBlockToQueue(blockMock);
      expect(mockQueue.enqueue).toHaveBeenCalledWith(blockMock);
    });

    it('should destroy strategy if enqueue fails in webhook stream strategy', async () => {
      service['_loadingStrategy'] = {
        name: StrategyNames.WEBHOOK_STREAM,
        isLoading: false,
        destroy: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(undefined),
      };

      const blockMock: Block = { height: BigInt(1), hash: 'hash 1', tx: [] };
      mockQueue.enqueue.mockReturnValue(false); // Simulate enqueue failure

      await service.addBlockToQueue(blockMock);

      expect(service['_loadingStrategy'].destroy).toHaveBeenCalled();
    });
  });

  describe('setupStrategy', () => {
    it('should create PullNetworkProviderStrategy if stream not allowed', async () => {
      service['_isStreamStrategyAllow'] = false;
      service['createStrategy'] = jest.fn().mockReturnValue({
        name: StrategyNames.PULL_NETWORK_PROVIDER,
      });

      mockNetworkProviderService.getCurrentBlockHeight.mockResolvedValue(BigInt(10));
      await service['setupStrategy']();
      expect(service['createStrategy']).toHaveBeenCalledWith(StrategyNames.PULL_NETWORK_PROVIDER, {
        minThreads: mockBlocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
        maxThreads: mockBlocksQueueConfig.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
      });
    });

    it('should create WebhookStreamStrategy if stream allowed and queue height within range', async () => {
      service['_isStreamStrategyAllow'] = true;
      service['createStrategy'] = jest.fn().mockReturnValue({
        name: StrategyNames.WEBHOOK_STREAM,
      });

      mockNetworkProviderService.getCurrentBlockHeight.mockResolvedValue(BigInt(10));
      mockQueue.lastHeight = BigInt(5);
      mockQueue.maxQueueLength = 10;
      await service['setupStrategy']();
      expect(service['createStrategy']).toHaveBeenCalledWith(StrategyNames.WEBHOOK_STREAM);
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

    it('should set delay before resetting strategy if current is WEBHOOK_STREAM', async () => {
      jest.useFakeTimers();
      service['_loadingStrategy'] = {
        name: StrategyNames.WEBHOOK_STREAM,
        isLoading: false,
        destroy: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(undefined),
      };

      await service.destroyStrategy();

      expect(service['_isStreamStrategyAllow']).toBe(false);

      jest.advanceTimersByTime(1000 * 60 * 5);
      expect(service['_isStreamStrategyAllow']).toBe(true);
      jest.useRealTimers();
    });
  });
});
