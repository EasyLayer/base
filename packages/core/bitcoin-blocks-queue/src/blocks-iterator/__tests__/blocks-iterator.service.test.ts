import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksQueueIteratorService } from '../blocks-iterator.service';
import { BlocksQueue } from '../../blocks-queue';
import { Block, BlocksCommandExecutor } from '../../interfaces';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

class TestBlock implements Block {
  height: number;
  hash: string;
  tx: any[];

  constructor(height: number) {
    this.height = height;
    this.hash = '';
    this.tx = [];
  }
}

describe('BlocksQueueIteratorService', () => {
  let service: BlocksQueueIteratorService;
  let mockLogger: AppLogger;
  let mockBlocksCommandExecutor: jest.Mocked<BlocksCommandExecutor>;
  let mockQueue: BlocksQueue<TestBlock>;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    mockBlocksCommandExecutor = {
      indexBlock: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockQueue = new BlocksQueue<TestBlock>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        {
          provide: 'BlocksCommandExecutor',
          useValue: mockBlocksCommandExecutor,
        },
        BlocksQueueIteratorService,
      ],
    }).compile();

    service = module.get<BlocksQueueIteratorService>(BlocksQueueIteratorService);
    service['_queue'] = mockQueue;
  });

  describe('peekFirstBlock', () => {
    it('should wait for blockProcessedPromise before returning the first block', async () => {
      const blockMock = new TestBlock(0);
      mockQueue.enqueue(blockMock);

      service['initBlockProcessedPromise']();
      const spy = jest.spyOn(service['_queue'], 'peekFirstBlock');

      const promise = service['peekFirstBlock']();

      expect(spy).not.toHaveBeenCalled();

      service['resolveNextBlock']();

      const result = await promise;

      expect(result).toEqual(blockMock);
      expect(service['_queue'].peekFirstBlock).toHaveBeenCalled();
    });
  });

  describe('initBlockProcessedPromise', () => {
    it('should create a promise and resolve it immediately if queue is empty', () => {
      service['initBlockProcessedPromise']();
      expect(service['blockProcessedPromise']).toBeInstanceOf(Promise);
      expect(service['resolveNextBlock']).toBeInstanceOf(Function);
    });

    it('should create a promise that can be resolved externally', async () => {
      const blockMock = new TestBlock(0);
      mockQueue.enqueue(blockMock);

      service['initBlockProcessedPromise']();

      let resolved = false;
      service['blockProcessedPromise'].then(() => {
        resolved = true;
      });

      service['resolveNextBlock']();
      await service['blockProcessedPromise'];
      expect(resolved).toBe(true);
    });
  });

  describe('processBlock', () => {
    it('should call blocksCommandExecutor.processBlock with correct arguments', async () => {
      const blockMock = new TestBlock(0);
      await service['processBlock'](blockMock);

      expect(mockBlocksCommandExecutor.indexBlock).toHaveBeenCalledWith({ batch: [blockMock], requestId: 'mock-uuid' });
    });

    it('should log an error if blocksCommandExecutor.processBlock throws an error', async () => {
      const blockMock = new TestBlock(0);
      mockBlocksCommandExecutor.indexBlock.mockRejectedValueOnce(new Error('Test Error'));
      service['initBlockProcessedPromise']();
      await service['processBlock'](blockMock);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to iterate the block',
        new Error('Test Error'),
        'BlocksQueueIteratorService'
      );
    });
  });
});
