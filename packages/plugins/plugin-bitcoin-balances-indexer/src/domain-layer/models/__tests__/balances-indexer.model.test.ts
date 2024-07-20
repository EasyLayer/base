import { Blockchain } from '../balances-indexer.model';

describe('Blockchain', () => {
  let blockchain: Blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('Initialization', () => {
    it('should initialize with size 0', () => {
      expect(blockchain.size).toBe(0);
    });
  });

  describe('addBatch', () => {
    it('should add a batch to a new block successfully', () => {
      const batch = {
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      };
      const result = blockchain.addBatch(batch);
      expect(result).toBe(true);
      expect(blockchain.size).toBe(1);
      expect(blockchain.lastBlockHeight).toBe(1);
      expect(blockchain.lastBlockHash).toBe('qwe');
    });

    it('should not add a batch with invalid previous hash', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const batch = {
        blockHash: 'ewq',
        blockHeight: 1,
        prevBlockHash: 'invalidHash',
        n: 0,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      };
      const result = blockchain.addBatch(batch);
      expect(result).toBe(false);
      expect(blockchain.size).toBe(1);
    });

    it('should not add a batch with non-sequential n', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const batch = {
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 2,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      };
      const result = blockchain.addBatch(batch);
      expect(result).toBe(false);
      expect(blockchain.size).toBe(1);
    });

    it('should add multiple batches to the same block', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 1,
        isFinalBatch: true,
        tx: ['qwe3', 'ewq4'],
      });
      expect(blockchain.size).toBe(1);
      expect(blockchain.lastBlockHeight).toBe(1);
      expect(blockchain.lastBlockHash).toBe('qwe');
      expect(blockchain.isLastBatchFinal).toBe(true);
    });

    it('should add batches to different blocks sequentially', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: true,
        tx: ['qwe1', 'ewq2'],
      });
      const result = blockchain.addBatch({
        blockHash: 'ewq',
        blockHeight: 2,
        prevBlockHash: 'qwe',
        n: 0,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      });
      expect(result).toBe(true);
      expect(blockchain.size).toBe(2);
      expect(blockchain.lastBlockHeight).toBe(2);
      expect(blockchain.lastBlockHash).toBe('ewq');
    });
  });

  describe('validateNextBatch', () => {
    it('should validate the first batch correctly', () => {
      const batch = {
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      };
      const isValid = blockchain.validateNextBatch(batch);
      expect(isValid).toBe(true);
    });

    it('should not validate a batch with invalid previous hash', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const batch = {
        blockHash: 'ewq',
        blockHeight: 2,
        prevBlockHash: 'invalidHash',
        n: 0,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      };
      const isValid = blockchain.validateNextBatch(batch);
      expect(isValid).toBe(false);
    });

    it('should not validate a batch with non-sequential n', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const batch = {
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 2,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      };
      const isValid = blockchain.validateNextBatch(batch);
      expect(isValid).toBe(false);
    });

    it('should validate a correct batch', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const batch = {
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 1,
        isFinalBatch: true,
        tx: ['qwe3', 'ewq4'],
      };
      const isValid = blockchain.validateNextBatch(batch);
      expect(isValid).toBe(true);
    });
  });

  describe('validateLastBatch', () => {
    it('should validate the last batch correctly', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 1,
        isFinalBatch: true,
        tx: ['qwe3', 'ewq4'],
      });
      const isValid = blockchain.validateLastBatch(1, 1);
      expect(isValid).toBe(true);
    });

    it('should not validate a non-final last batch', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 1,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      });
      const isValid = blockchain.validateLastBatch(1, 1);
      expect(isValid).toBe(false);
    });
  });

  describe('truncateToBlock', () => {
    it('should truncate the blockchain correctly', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: true,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'ewq',
        blockHeight: 2,
        prevBlockHash: 'qwe',
        n: 0,
        isFinalBatch: true,
        tx: ['qwe3', 'ewq4'],
      });
      const removedBlocks = blockchain.truncateToBlock(1);
      expect(removedBlocks.length).toBe(1);
      expect(blockchain.size).toBe(1);
      expect(blockchain.lastBlockHeight).toBe(1);
    });
  });

  describe('truncateToBatch', () => {
    it('should truncate the blockchain to a specific batch', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: true,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'ewq',
        blockHeight: 2,
        prevBlockHash: 'qwe',
        n: 0,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      });
      blockchain.addBatch({
        blockHash: 'ewq',
        blockHeight: 2,
        prevBlockHash: 'qwe',
        n: 1,
        isFinalBatch: true,
        tx: ['qwe5', 'ewq6'],
      });
      const removedBatches = blockchain.truncateToBatch(2, 0);
      expect(removedBatches.length).toBe(1);
      expect(blockchain.size).toBe(2);
      expect(blockchain.lastBatchIndex).toBe(0);
    });
  });

  describe('removeOneBatchByBlock', () => {
    it('should remove a batch from a block', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 1,
        isFinalBatch: true,
        tx: ['qwe3', 'ewq4'],
      });
      const result = blockchain.removeOneBatchByBlock(1, 1);
      expect(result).toBe(true);
      expect(blockchain.size).toBe(1);
      expect(blockchain.lastBatchIndex).toBe(0);
    });

    it('should return false if batch not found', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: false,
        tx: ['qwe1', 'ewq2'],
      });
      const result = blockchain.removeOneBatchByBlock(1, 1);
      expect(result).toBe(false);
    });
  });

  describe('findBlockByHeight', () => {
    it('should find a block by its height', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: true,
        tx: ['qwe1', 'ewq2'],
      });
      blockchain.addBatch({
        blockHash: 'ewq',
        blockHeight: 1,
        prevBlockHash: 'qwe',
        n: 0,
        isFinalBatch: false,
        tx: ['qwe3', 'ewq4'],
      });
      const block = blockchain.findBlockByHeight(1);
      expect(block).toEqual({
        hash: 'qwe',
        height: 1,
        prevHash: '',
        batches: new Map([[0, { tx: ['qwe1', 'ewq2'], isFinalBatch: true }]]),
      });
    });

    it('should return null if block not found', () => {
      blockchain.addBatch({
        blockHash: 'qwe',
        blockHeight: 1,
        prevBlockHash: null,
        n: 0,
        isFinalBatch: true,
        tx: ['qwe1', 'ewq2'],
      });
      const block = blockchain.findBlockByHeight(2);
      expect(block).toBeNull();
    });
  });
});
