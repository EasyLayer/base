import { Blockchain } from '../balances-indexer.model';

describe('Blockchain', () => {
  let blockchain: Blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  it('should initialize with size 0', () => {
    expect(blockchain.size).toBe(0);
  });

  it('should add a block successfully', () => {
    const result = blockchain.addBlock(0, 'hash0', 'prevHash0');
    expect(result).toBe(true);
    expect(blockchain.size).toBe(1);
    expect(blockchain.lastBlockHeight).toBe(BigInt(0));
    expect(blockchain.lastBlockHash).toBe('hash0');
  });

  it('should not add a block with invalid height', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    const result = blockchain.addBlock(2, 'hash2', 'hash0'); // invalid height, should be 1
    expect(result).toBe(false);
    expect(blockchain.size).toBe(1);
  });

  it('should not add a block with invalid previous hash', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    const result = blockchain.addBlock(1, 'hash1', 'invalidPrevHash'); // invalid previous hash
    expect(result).toBe(false);
    expect(blockchain.size).toBe(1);
  });

  it('should validate the last block correctly', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    const isValid = blockchain.validateLastBlock(0, 'hash0', 'prevHash0');
    expect(isValid).toBe(true);
  });

  it('should not validate an invalid last block', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    const isValid = blockchain.validateLastBlock(1, 'hash1', 'hash0'); // invalid block data
    expect(isValid).toBe(false);
  });

  it('should peek the last block correctly', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    const lastBlock = blockchain.peekLast();
    expect(lastBlock).toEqual({
      height: BigInt(0),
      hash: 'hash0',
      prevHash: 'prevHash0',
    });
  });

  it('should truncate the blockchain correctly', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    blockchain.addBlock(1, 'hash1', 'hash0');
    blockchain.addBlock(2, 'hash2', 'hash1');
    const truncated = blockchain.truncateToBlock(2n);
    expect(truncated).toBe(true);
    expect(blockchain.size).toBe(2);
    expect(blockchain.lastBlockHeight).toBe(BigInt(1));
  });

  it('should remove the first block when max size is exceeded', () => {
    for (let i = 0; i < 101; i++) {
      blockchain.addBlock(i, `hash${i}`, i === 0 ? 'prevHash0' : `hash${i - 1}`);
    }
    expect(blockchain.size).toBe(100);
    expect(blockchain.lastBlockHeight).toBe(BigInt(100));
    expect(blockchain.findBlockByHeight(0n)).toBe(null);
  });

  it('should validate the entire chain correctly', () => {
    blockchain.addBlock(0, 'hash0', 'prevHash0');
    blockchain.addBlock(1, 'hash1', 'hash0');
    blockchain.addBlock(2, 'hash2', 'hash1');
    const isValidChain = blockchain.validateChain();
    expect(isValidChain).toBe(true);
  });

  it('should not validate an invalid chain due to height mismatch', () => {
    // Добавляем блоки вручную для создания недействительной цепочки
    blockchain['head'] = {
      block: { height: 0n, hash: 'hash0', prevHash: 'prevHash0' },
      next: null,
      prev: null,
    };
    blockchain['tail'] = blockchain['head'];
    blockchain['_size'] = 1;

    const block1 = {
      block: { height: 1n, hash: 'hash1', prevHash: 'hash0' },
      next: null,
      prev: blockchain['head'],
    };
    blockchain['head'].next = block1;
    blockchain['tail'] = block1;
    blockchain['_size'] = 2;

    const invalidBlock = {
      block: { height: 3n, hash: 'hash3', prevHash: 'hash1' }, // invalid height
      next: null,
      prev: blockchain['tail'],
    };
    blockchain['tail'].next = invalidBlock;
    blockchain['tail'] = invalidBlock;
    blockchain['_size'] = 3;

    const isValidChain = blockchain.validateChain();
    expect(isValidChain).toBe(false);
  });

  it('should not validate an invalid chain due to hash mismatch', () => {
    // Добавляем блоки вручную для создания недействительной цепочки
    blockchain['head'] = {
      block: { height: 0n, hash: 'hash0', prevHash: 'prevHash0' },
      next: null,
      prev: null,
    };
    blockchain['tail'] = blockchain['head'];
    blockchain['_size'] = 1;

    const block1 = {
      block: { height: 1n, hash: 'hash1', prevHash: 'hash0' },
      next: null,
      prev: blockchain['head'],
    };
    blockchain['head'].next = block1;
    blockchain['tail'] = block1;
    blockchain['_size'] = 2;

    const invalidBlock = {
      block: { height: 2n, hash: 'hash2', prevHash: 'invalidHash' }, // invalid previous hash
      next: null,
      prev: blockchain['tail'],
    };
    blockchain['tail'].next = invalidBlock;
    blockchain['tail'] = invalidBlock;
    blockchain['_size'] = 3;

    const isValidChain = blockchain.validateChain();
    expect(isValidChain).toBe(false);
  });
});
