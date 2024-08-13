import { Test, TestingModule } from '@nestjs/testing';
import { Type } from '@nestjs/common';
import { BitcoinNetworkProviderModule } from '@easylayer/core/bitcoin-network-provider';
import { LoggerModule } from '@easylayer/components/logger';
import { BlocksQueueModule, BlocksQueueModuleOptions } from '../blocks-queue.module';
import { BlocksQueueController } from '../blocks-queue.controller';
import { BlocksQueueService } from '../blocks-queue.service';
import { BlocksQueueIteratorService } from '../blocks-iterator';
import { BlocksQueueLoaderService } from '../blocks-loader';
import { BlocksQueueCollectorService } from '../blocks-collector';
import { BlocksCommandExecutor } from '../interfaces';

describe('BlocksQueueModule', () => {
  let module: TestingModule;

  const mockBlocksCommandExecutor: Type<BlocksCommandExecutor> = class {
    async indexBlock() {}
  };
  const moduleOptions: BlocksQueueModuleOptions = {
    blocksCommandExecutor: mockBlocksCommandExecutor,
    isTransportMode: false,
    maxBlockHeight: 1,
    queueWorkersNum: 1,
    maxQueueLength: 2,
    queueLoaderStrategyName: 'pull-network-provider-by-batches',
    queueLoaderNetworkProviderBatchesLength: 1,
    queueLoaderIntervalMs: 500,
    queueLoaderMaxIntervalMs: 10 * 60 * 1000,
    queueLoaderMaxIntervalMultiplier: 10,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // IMPORTANT: We are explicitly importing the BitcoinNetworkProviderModule for testing
        BitcoinNetworkProviderModule.forRootAsync({ isGlobal: true, selfNodesUrl: 'http://localhost' }),
        BlocksQueueModule.forRootAsync(moduleOptions),
      ],
    }).compile();
  });

  it('should compile the module', async () => {
    expect(module).toBeDefined();
    expect(module.get(BlocksQueueController)).toBeInstanceOf(BlocksQueueController);
    // IMPORTANT: The queue service is accessed using a custom token
    expect(module.get('BlocksQueueService')).toBeInstanceOf(BlocksQueueService);
    expect(module.get(BlocksQueueIteratorService)).toBeInstanceOf(BlocksQueueIteratorService);
    expect(module.get(BlocksQueueLoaderService)).toBeInstanceOf(BlocksQueueLoaderService);
    expect(module.get(BlocksQueueCollectorService)).toBeInstanceOf(BlocksQueueCollectorService);
    expect(module.get(LoggerModule)).toBeDefined();
  });
});
