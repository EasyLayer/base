import { Test, TestingModule } from '@nestjs/testing';
import { Type } from '@nestjs/common';
import { BitcoinNetworkProviderModule } from '@easylayer/bitcoin-network-provider';
import { TransactionsQueueModule, TransactionsQueueModuleOptions } from '../transactions-queue.module';
import { TransactionsQueueController } from '../transactions-queue.controller';
import { TransactionsQueueService } from '../transactions-queue.service';
import { BatchesQueueIteratorService } from '../batches-iterator';
import { BatchesQueueLoaderService } from '../batches-loader';
import { BatchesQueueCollectorService } from '../batches-collector';
import { LoggerModule } from '@easylayer/logger';
import { TransactionsQueueConfig } from '../config/transactions-queue.config';
import { BatchesCommandExecutor } from '../interfaces';

describe('TransactionsQueueModule', () => {
  let module: TestingModule;
  const mockBatchesCommandExecutor: Type<BatchesCommandExecutor> = class {
    async indexBatch() {}
  };
  const moduleOptions: TransactionsQueueModuleOptions = {
    batchesCommandExecutor: mockBatchesCommandExecutor,
    isTransportMode: false,
    maxBlockHeight: 1,
  };
  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // IMPORTANT: We are explicitly importing the BitcoinNetworkProviderModule for testing
        BitcoinNetworkProviderModule.forRootAsync({ isGlobal: true }),
        TransactionsQueueModule.forRootAsync(moduleOptions),
      ],
    }).compile();
  });

  it('should compile the module', async () => {
    expect(module).toBeDefined();
    expect(module.get(TransactionsQueueController)).toBeInstanceOf(TransactionsQueueController);
    // IMPORTANT: The queue service is accessed using a custom token
    expect(module.get('TransactionsQueueService')).toBeInstanceOf(TransactionsQueueService);
    expect(module.get(BatchesQueueIteratorService)).toBeInstanceOf(BatchesQueueIteratorService);
    expect(module.get(BatchesQueueLoaderService)).toBeInstanceOf(BatchesQueueLoaderService);
    expect(module.get(BatchesQueueCollectorService)).toBeInstanceOf(BatchesQueueCollectorService);
    expect(module.get(LoggerModule)).toBeDefined();
    expect(module.get(TransactionsQueueConfig)).toBeInstanceOf(TransactionsQueueConfig);
  });
});
