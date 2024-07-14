import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService, BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BatchesQueueLoaderService } from '../../batches-loader';
import { TransactionsBatchQueue } from '../../transactions-batch-queue';
import { TransactionsBatch } from '../../interfaces';
import { TransactionsQueueConfig } from '../../config/transactions-queue.config';
import { StrategyNames } from '../load-strategies';
import { BatchesQueueCollectorService } from '../../batches-collector';
import { backOff } from 'exponential-backoff';

jest.mock('exponential-backoff', () => ({
  backOff: jest.fn(),
}));

describe('BatchesQueueLoaderService', () => {
  let service: BatchesQueueLoaderService;
  let mockLogger: AppLogger;
  let mockNetworkProviderService: jest.Mocked<BitcoinNetworkProviderService>;
  let mockWebhookStreamService: jest.Mocked<BitcoinWebhookStreamService>;
  let mockTransactionsQueueConfig: jest.Mocked<TransactionsQueueConfig>;
  let mockQueue: jest.Mocked<TransactionsBatchQueue<TransactionsBatch>>;
  let mockCollectorService: jest.Mocked<BatchesQueueCollectorService>;
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
      createStream: jest.fn(),
      handleStream: jest.fn(),
    } as any;
    mockTransactionsQueueConfig = {
      BITCOIN_TRANSACTIONS_QUEUE_MAX_LENGTH: 5,
      BITCOIN_TRANSACTIONS_QUEUE_MAX_BLOCK_HEIGHT: 10n,
      isAllowStreamLoad: jest.fn().mockReturnValue(true),
    } as any;
    mockQueue = {
      enqueue: jest.fn(),
      fetchBatchFromOutStack: jest.fn(),
      peekFirstBatch: jest.fn(),
      dequeue: jest.fn(),
      clear: jest.fn(),
      get length() {
        return 0;
      },
      set length(value: number) {},
      lastHeight: BigInt(0),
    } as any;
    mockCollectorService = {
      addBlock: jest.fn(),
      addBatch: jest.fn(),
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
          provide: TransactionsQueueConfig,
          useValue: mockTransactionsQueueConfig,
        },
        {
          provide: BatchesQueueCollectorService,
          useValue: mockCollectorService,
        },
        {
          provide: BatchesQueueLoaderService,
          useFactory: (logger, config, collector, networkProvider, webhookStreamService) =>
            new BatchesQueueLoaderService(logger, config, collector, networkProvider, webhookStreamService, options),
          inject: [
            AppLogger,
            TransactionsQueueConfig,
            BatchesQueueCollectorService,
            BitcoinNetworkProviderService,
            BitcoinWebhookStreamService,
          ],
        },
      ],
    }).compile();

    service = module.get<BatchesQueueLoaderService>(BatchesQueueLoaderService);
    service['_queue'] = mockQueue;
  });

  describe('startTransactionsLoading', () => {
    it('should not start loading if already loading', async () => {
      jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
      jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());
      await service.startTransactionsLoading(0, mockQueue);
      await service.startTransactionsLoading(0, mockQueue);
      expect(backOff).toHaveBeenCalledTimes(1);
    });

    it('should set queue and start loading', async () => {
      jest.spyOn(service as any, 'setupStrategy').mockImplementation(() => Promise.resolve());
      jest.spyOn(service as any, 'destroyStrategy').mockImplementation(() => Promise.resolve());
      await service.startTransactionsLoading(0, mockQueue);
      expect(service['isLoading']).toBe(true);
      expect(service['_queue']).toBe(mockQueue);
      expect(service['_queue'].lastHeight).toBe(BigInt(0));
      expect(backOff).toHaveBeenCalled();
    });
  });

  describe('handleBlockFromStream', () => {
    it('should destroy strategy if addBlock fails', async () => {
      service['_loadingStrategy'] = {
        name: StrategyNames.BLOCKS_WEBHOOK_STREAM,
        isLoading: false,
        destroy: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(undefined),
      };
      const blockMock: any = { height: BigInt(1), hash: 'hash 1', tx: [] };
      jest.spyOn(mockCollectorService, 'addBlock').mockReturnValue(false);
      await service.handleBlockFromStream(blockMock);
      expect(mockCollectorService.addBlock).toHaveBeenCalledWith(blockMock);
      expect(service['_loadingStrategy'].destroy).toHaveBeenCalled();
    });
  });

  describe('setupStrategy', () => {
    it('should create PullBlocksByNetworkProviderStrategy if transport mode is off', async () => {
      service['_isTransportMode'] = false;
      service['createStrategy'] = jest.fn().mockReturnValue({
        name: StrategyNames.PULL_BLOCKS_BY_NETWORK_PROVIDER,
      });
      mockNetworkProviderService.getCurrentBlockHeight.mockResolvedValue(BigInt(10));
      await service['setupStrategy']();
      expect(service['createStrategy']).toHaveBeenCalledWith();
    });

    it('should create BlocksWebhookStreamStrategy if transport mode is on', async () => {
      service['_isTransportMode'] = true;
      service['createStrategy'] = jest.fn().mockReturnValue({
        name: StrategyNames.BLOCKS_WEBHOOK_STREAM,
      });
      mockNetworkProviderService.getCurrentBlockHeight.mockResolvedValue(BigInt(10));
      await service['setupStrategy']();
      expect(service['createStrategy']).toHaveBeenCalledWith();
    });
  });

  describe('destroyStrategy', () => {
    it('should destroy the current strategy and set it to null', async () => {
      const mockDestroy = jest.fn().mockResolvedValue(undefined);
      service['_loadingStrategy'] = {
        name: StrategyNames.BLOCKS_WEBHOOK_STREAM,
        isLoading: false,
        destroy: mockDestroy,
        load: jest.fn().mockResolvedValue(undefined),
      };
      await service.destroyStrategy();
      expect(mockDestroy).toHaveBeenCalled();
      expect(service['_loadingStrategy']).toBeNull();
    });
  });
});
