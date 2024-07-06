import { Test, TestingModule } from '@nestjs/testing';
import { Type } from '@nestjs/common';
import { BitcoinNetworkProviderModule } from '@easylayer/bitcoin-network-provider';
import { BlocksQueueModule, BlocksQueueModuleOptions } from '../blocks-queue.module';
import { BlocksQueueController } from '../blocks-queue.controller';
import { BlocksQueueService } from '../blocks-queue.service';
import { BlocksQueueIteratorService } from '../blocks-iterator';
import { BlocksQueueLoaderService } from '../blocks-loader';
import { BlocksQueueCollectorService } from '../blocks-collector';
import { LoggerModule } from '@easylayer/logger';
import { BlocksQueueConfig } from '../config/blocks-queue.config';
import { BlocksCommandExecutor } from '../interfaces';

describe('BlocksQueueModule', () => {
  let module: TestingModule;

  const mockBlocksCommandExecutor: Type<BlocksCommandExecutor> = class {
    async indexBlock() {}
  };
  const moduleOptions: BlocksQueueModuleOptions = {
    blocksCommandExecutor: mockBlocksCommandExecutor,
    isTransportMode: false,
    maxBlockHeight: 1n,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // IMPORTANT: We are explicitly importing the BitcoinNetworkProviderModule for testing
        BitcoinNetworkProviderModule.forRootAsync({ isGlobal: true }),
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
    expect(module.get(BlocksQueueConfig)).toBeInstanceOf(BlocksQueueConfig);
  });
});
