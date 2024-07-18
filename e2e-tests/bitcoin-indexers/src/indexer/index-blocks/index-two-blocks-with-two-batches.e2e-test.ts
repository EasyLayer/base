import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import {
  BitcoinIndexerBlockIndexedEvent,
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerTransactionsBatchIndexedEvent,
  BitcoinIndexerChainBlockAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-indexer';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { mockBlocks } from './mocks/two-blocks-with-few-tx';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

jest.mock('piscina', () => {
  return jest.fn().mockImplementation(() => {
    return {
      run: jest.fn().mockImplementation(({ height }) => {
        const block = mockBlocks.find((block) => BigInt(block.height) === BigInt(height));
        if (!block) {
          return Promise.reject(new Error(`Block with height ${height} not found`));
        }
        return Promise.resolve(block);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      options: {
        maxThreads: process.env.BITCOIN_BLOCKS_QUEUE_WORKERS_NUM,
      },
    };
  });
});

describe('/Index Two Block With Two Transactions Batches', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;

  afterAll(async () => {
    if (app) {
      try {
        await app.close();
      } catch (error) {
        console.error(error);
      }
    }
    if (dbService) {
      try {
        await dbService.close();
      } catch (error) {
        console.error(error);
      }
    }
  });

  beforeAll(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    // Clear the database
    await cleanDataFolder();

    // Calculate the size of transactions
    // IMPORTANT: We want to know how much transactions weigh
    // so that we can split them into batches from memory, for testing
    const totalSize = mockBlocks.reduce((total, block) => {
      return (
        total +
        block.tx.reduce((blockTotal, tx) => {
          return blockTotal + JSON.stringify(tx).length;
        }, 0)
      );
    }, 0);

    // How many batches do we want to get
    const numBatches = 3;
    const maxBatchSize = Math.ceil(totalSize / numBatches);

    process.env.BITCOIN_INDEXER_MAX_TRANSACTIONS_BATCH_SIZE = maxBatchSize.toString();

    // Initialize transactional context before any database interaction
    initializeTransactionalContext();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/indexer/index-blocks/.env') });

    const indexer = await BitcoinIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    // IMPORTANT: We need EventBus to handle when event will be happend,
    // get EventBus from nest we can't for some reason
    // (It is some bug, when we replaced old EventBus in nestjs/cqrs by our new CustomEventBus,
    // nest doesn't allow us to get the new one, only old)
    // so we get crqs module from nest and then eventbus (CustomEventBus) from cqrs.
    const cqrs: any = app.get<CqrsModule>(CqrsModule);
    eventBus = cqrs.eventBus;

    const createEventPromise = (eventType: any, expectedCount: number): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (!(eventBus.eventHandlerCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.eventHandlerCompletionSubject$ is not Observable');
        }

        // IMPORTANT: This counter is needed so that we index several blocks batches
        // and not stop at the first ones
        let eventCount = 0;

        eventBus.eventHandlerCompletionSubject$.pipe(ofType(eventType)).subscribe({
          next: () => {
            eventCount++;
            if (eventCount >= expectedCount) {
              resolve();
            }
          },
          error: (err: any) => reject(err),
        });
      });
    };

    const saveBlockPromise = createEventPromise(BitcoinIndexerBlockIndexedEvent, 2); // 2 blocks
    const saveTransactionsBatchPromise = createEventPromise(BitcoinIndexerTransactionsBatchIndexedEvent, 4); // 4 batches (1 + 3)

    await Promise.all([saveBlockPromise, saveTransactionsBatchPromise]);

    await app.close();
  });

  it('should save events of index aggregates correctly', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await dbService.connect();

    // Get aggregates events
    const events = await dbService.all(`SELECT * FROM events`);

    // Group events by type and test that each type of event is only called once
    const eventTypes = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    expect(eventTypes[BitcoinIndexerInitializedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerTransactionsBatchIndexedEvent.name]).toBe(4);
    expect(eventTypes[BitcoinIndexerBlockIndexedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinIndexerChainBlockAddedEvent.name]).toBe(2);

    // Check that there are three events for 'indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'indexer');
    expect(indexerEvents.length).toBe(3);
    expect(indexerEvents[0].version).toBe(1);
    expect(indexerEvents[1].version).toBe(2);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check first block data correctness for the event with aggregateId equal to block hash
    const blockEvent0 = events.find((event) => event.aggregateId === mockBlocks[0].hash);
    expect(blockEvent0).toBeDefined();
    const blockPayload0 = JSON.parse(blockEvent0.payload);
    expect(blockPayload0.block.height).toBe(mockBlocks[0].height);
    expect(blockPayload0.block.hash).toBe(mockBlocks[0].hash);

    // Check second block data correctness for the event with aggregateId equal to block hash
    const blockEvent1 = events.find((event) => event.aggregateId === mockBlocks[1].hash);
    expect(blockEvent1).toBeDefined();
    const blockPayload1 = JSON.parse(blockEvent1.payload);
    expect(blockPayload1.block.height).toBe(mockBlocks[1].height);
    expect(blockPayload1.block.hash).toBe(mockBlocks[1].hash);

    // Check if the transactions batch event has transactions and their data
    const batchEvents = events.filter((event) => event.type === BitcoinIndexerTransactionsBatchIndexedEvent.name);
    expect(batchEvents.length).toBe(4);

    // Concatenate all transactions from batch events
    const allBatchTransactions = batchEvents.flatMap((batchEvent) => JSON.parse(batchEvent.payload).batch.tx);

    // Check that transactions from mockBlocks are in the same order in batch events
    const allMockTransactions = [...mockBlocks[0].tx, ...mockBlocks[1].tx];
    expect(allBatchTransactions.length).toBe(allMockTransactions.length);

    allBatchTransactions.forEach((transaction, index) => {
      expect(transaction.txid).toBe(allMockTransactions[index].txid);
    });
  });

  it('should save new block and transactions into read db', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-read.db') });
    await dbService.connect();

    // Fetch blocks with their transactions
    const blocksWithTransactions = await dbService.all(`
      SELECT
        b.hash AS blockHash,
        b.status AS blockStatus,
        t.id as transactionId,
        t.txid AS transactionTxid,
        t.status AS transactionStatus,
        t.vin AS transactionVin,
        t.vout AS transactionVout
      FROM
        blocks b
      LEFT JOIN
        transactions t ON b.hash = t.blockHash
    `);

    // Group transactions by block
    const blocks: any = {};
    blocksWithTransactions.forEach((record: any) => {
      if (!blocks[record.blockHash]) {
        blocks[record.blockHash] = {
          hash: record.blockHash,
          status: record.blockStatus,
          transactions: [],
        };
      }
      if (record.transactionTxid) {
        blocks[record.blockHash].transactions.push({
          id: record.transactionId,
          txid: record.transactionTxid,
          status: record.transactionStatus,
          vin: JSON.parse(record.transactionVin), // Parse JSON string to object
          vout: JSON.parse(record.transactionVout), // Parse JSON string to object
        });
      }
    });

    // Sort transactions within each block by 'id' to ensure order
    Object.values(blocks).forEach((block: any) => {
      block.transactions.sort((a: any, b: any) => a.id - b.id);
    });

    const blockList: any = Object.values(blocks);

    // Check the number of blocks and transactions saved
    expect(blockList.length).toBe(2);
    expect(blockList[0].transactions.length).toBe(1);
    expect(blockList[1].transactions.length).toBe(20);

    // Verify first block data using mockBlocks
    const expectedBlock0 = mockBlocks[0];
    expect(blockList[0].hash).toBe(expectedBlock0.hash);
    expect(blockList[0].status).toBe('indexed');

    // Verify second block data using mockBlocks
    const expectedBlock1 = mockBlocks[1];
    expect(blockList[1].hash).toBe(expectedBlock1.hash);
    expect(blockList[1].status).toBe('indexed');

    // Verify transaction data using mockBlocks
    const verifyTransactions = (expectedTransactions: any, savedTransactions: any) => {
      expect(savedTransactions.length).toBe(expectedTransactions.length);
      expectedTransactions.forEach((expectedTx: any, index: number) => {
        const savedTx = savedTransactions[index];
        expect(savedTx.txid).toBe(expectedTx.txid);
        expect(savedTx.status).toBe('indexed');
        expect(savedTx.vin).toEqual(expectedTx.vin);
        expect(savedTx.vout).toEqual(expectedTx.vout);
      });
    };

    // Verify transactions for the first block
    verifyTransactions(expectedBlock0.tx, blockList[0].transactions);

    // Verify transactions for the second block
    verifyTransactions(expectedBlock1.tx, blockList[1].transactions);

    //Flatten all transactions for easier comparison
    const allSavedTransactions = blockList.flatMap((block: any) => block.transactions);
    const allExpectedTransactions = [...mockBlocks[0].tx, ...mockBlocks[1].tx];

    // Verify all transactions in the correct order
    allSavedTransactions.forEach((savedTx: any, index: number) => {
      const expectedTx = allExpectedTransactions[index];
      expect(savedTx.txid).toBe(expectedTx.txid);
      expect(savedTx.vin).toEqual(expectedTx.vin);
      expect(savedTx.vout).toEqual(expectedTx.vout);
    });
  });
});
