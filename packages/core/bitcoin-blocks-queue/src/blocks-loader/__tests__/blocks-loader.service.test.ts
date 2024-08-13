import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/core/bitcoin-network-provider';
import { AppLogger } from '@easylayer/components/logger';
// import { exponentialIntervalAsync } from '@easylayer/components/exponential-interval-async';
import { BlocksQueueLoaderService } from '../blocks-loader.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block } from '../../interfaces';
import { StrategyNames } from '../load-strategies';

// TODO: fix a problem with mock @easylayer/components/exponential-interval-async
// jest.mock('@easylayer/components/exponential-interval-async');

// jest.mock('@easylayer/components/exponential-interval-async', () => ({
//   // Mock specific exports from the module
//   exponentialIntervalAsync: jest.fn().mockResolvedValue(undefined), // Mock the function
// }));

describe('BlocksQueueLoaderService', () => {
  let service: BlocksQueueLoaderService;
  let mockLogger: AppLogger;
  let mockNetworkProviderService: jest.Mocked<BitcoinNetworkProviderService>;
  let mockWebhookStreamService: jest.Mocked<BitcoinWebhookStreamService>;
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
          provide: BlocksQueueLoaderService,
          useFactory: (logger, networkProviderService, webhookStreamService) =>
            new BlocksQueueLoaderService(logger, networkProviderService, webhookStreamService, options),
          inject: [AppLogger, BitcoinNetworkProviderService, BitcoinWebhookStreamService],
        },
      ],
    }).compile();

    service = module.get<BlocksQueueLoaderService>(BlocksQueueLoaderService);
    service['_queue'] = mockQueue;
  });

  // TODO: fix a problem with mock @easylayer/components/exponential-interval-async
  // describe('startBlocksLoading', () => {
  //   it('should not start loading if already loading', async () => {
  //     jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
  //     jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());

  //     await service.startBlocksLoading(0, mockQueue);
  //     await service.startBlocksLoading(0, mockQueue);

  //     expect(exponentialIntervalAsync).toHaveBeenCalledTimes(1);
  //   });

  //   it('should set queue and start loading', async () => {
  //     jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
  //     jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());

  //     await service.startBlocksLoading(0, mockQueue);
  //     expect(service['isLoading']).toBe(true);
  //     expect(service['_queue']).toBe(mockQueue);
  //     expect(service['_queue'].lastHeight).toBe(0);
  //     expect(exponentialIntervalAsync).toHaveBeenCalled();
  //   });
  // });

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
