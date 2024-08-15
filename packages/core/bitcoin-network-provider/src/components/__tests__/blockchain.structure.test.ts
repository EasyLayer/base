import { Blockchain } from '../blockchain.structure';

describe('Blockchain', () => {
  let blockchain: Blockchain;

  const maxSize = 100;

  beforeEach(() => {
    blockchain = new Blockchain({ maxSize });
  });

  describe('Initialization', () => {
    it('should initialize with size 0', () => {
      expect(blockchain.size).toBe(0);
    });
  });

  describe('addBlock', () => {
    it('should add a block successfully', () => {
      const result = blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      expect(result).toBe(true);
      expect(blockchain.size).toBe(1);
      expect(blockchain.lastBlockHeight).toBe(0);
      expect(blockchain.lastBlockHash).toBe('hash0');
    });

    it('should not add a block with invalid height', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const result = blockchain.addBlock(2, 'hash2', 'hash0', []); // invalid height, should be 1
      expect(result).toBe(false);
      expect(blockchain.size).toBe(1);
    });

    it('should not add a block with invalid previous hash', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const result = blockchain.addBlock(1, 'hash1', 'invalidPrevHash', []); // invalid previous hash
      expect(result).toBe(false);
      expect(blockchain.size).toBe(1);
    });

    it('should add multiple blocks successfully', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      blockchain.addBlock(1, 'hash1', 'hash0', []);
      blockchain.addBlock(2, 'hash2', 'hash1', []);
      expect(blockchain.size).toBe(3);
      expect(blockchain.lastBlockHeight).toBe(2);
      expect(blockchain.lastBlockHash).toBe('hash2');
    });

    it('should remove the first block when max size is exceeded', () => {
      for (let i = 0; i < maxSize + 1; i++) {
        blockchain.addBlock(i, `hash${i}`, i === 0 ? 'prevHash0' : `hash${i - 1}`, []);
      }
      expect(blockchain.size).toBe(maxSize);
      expect(blockchain.lastBlockHeight).toBe(maxSize);
      expect(blockchain.findBlockByHeight(0)).toBe(null);
    });
  });

  describe('validateNextBlock', () => {
    it('should validate the first block correctly', () => {
      const isValid = blockchain.validateNextBlock(0, 'prevHash0');
      expect(isValid).toBe(true);
    });

    it('should not validate a block with invalid height', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const isValid = blockchain.validateNextBlock(2, 'hash0'); // invalid height, should be 1
      expect(isValid).toBe(false);
    });

    it('should not validate a block with invalid previous hash', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const isValid = blockchain.validateNextBlock(1, 'invalidPrevHash'); // invalid previous hash
      expect(isValid).toBe(false);
    });

    it('should validate a correct block', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const isValid = blockchain.validateNextBlock(1, 'hash0');
      expect(isValid).toBe(true);
    });
  });

  describe('validateLastBlock', () => {
    it('should validate the last block correctly', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const isValid = blockchain.validateLastBlock(0, 'hash0', 'prevHash0');
      expect(isValid).toBe(true);
    });

    it('should not validate an invalid last block', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const isValid = blockchain.validateLastBlock(1, 'hash1', 'hash0'); // invalid block data
      expect(isValid).toBe(false);
    });
  });

  describe('peekLast', () => {
    it('should return null if the chain is empty', () => {
      const lastBlock = blockchain.peekLast();
      expect(lastBlock).toBeNull();
    });

    it('should peek the last block correctly', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const lastBlock = blockchain.peekLast();
      expect(lastBlock).toEqual({
        height: 0,
        hash: 'hash0',
        prevHash: 'prevHash0',
        tx: [],
      });
    });
  });

  describe('truncateToBlock', () => {
    it('should truncate the blockchain correctly', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      blockchain.addBlock(1, 'hash1', 'hash0', []);
      blockchain.addBlock(2, 'hash2', 'hash1', []);
      const truncated = blockchain.truncateToBlock(2);
      expect(truncated).toBe(true);
      expect(blockchain.size).toBe(2);
      expect(blockchain.lastBlockHeight).toBe(1);
    });

    it('should return false if the block was not found', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const truncated = blockchain.truncateToBlock(5);
      expect(truncated).toBe(false);
      expect(blockchain.size).toBe(1);
    });
  });

  describe('removeOldestChain', () => {
    it('should remove the first block correctly', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      blockchain.addBlock(1, 'hash1', 'hash0', []);
      const removedBlock = blockchain['removeOldestChain']();
      expect(removedBlock).toEqual({
        height: 0,
        hash: 'hash0',
        prevHash: 'prevHash0',
        tx: [],
      });
      expect(blockchain.size).toBe(1);
      expect(blockchain.firstBlockHash).toBe('hash1');
    });

    it('should return null if the chain is empty', () => {
      const removedBlock = blockchain['removeOldestChain']();
      expect(removedBlock).toBeNull();
      expect(blockchain.size).toBe(0);
    });
  });

  describe('findBlockByHeight', () => {
    it('should find a block by its height', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      blockchain.addBlock(1, 'hash1', 'hash0', []);
      const block = blockchain.findBlockByHeight(1);
      expect(block).toEqual({
        height: 1,
        hash: 'hash1',
        prevHash: 'hash0',
        tx: [],
      });
    });

    it('should return null if the block is not found', () => {
      blockchain.addBlock(0, 'hash0', 'prevHash0', []);
      const block = blockchain.findBlockByHeight(1);
      expect(block).toBeNull();
    });
  });
});
