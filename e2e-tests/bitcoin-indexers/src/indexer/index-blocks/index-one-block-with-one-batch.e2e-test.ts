import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { take, Observable } from 'rxjs';
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
import { mockBlocks } from './mocks/one-block-with-one-tx';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

jest.mock('piscina', () => {
  return jest.fn().mockImplementation(() => {
    return {
      run: jest.fn().mockImplementation(({ height }) => {
        const block = mockBlocks.find((block) => Number(block.height) === Number(height));
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

describe('/Index One Block With One Transactions Batch', () => {
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

    const createEventPromise = (eventType: any): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (!(eventBus.eventHandlerCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.eventHandlerCompletionSubject$ is not Observable');
        }

        eventBus.eventHandlerCompletionSubject$.pipe(ofType(eventType), take(1)).subscribe({
          next: () => resolve(),
          error: (err: any) => reject(err),
        });
      });
    };

    const saveBlockPromise = createEventPromise(BitcoinIndexerBlockIndexedEvent);
    const saveTransactionsBatchPromise = createEventPromise(BitcoinIndexerTransactionsBatchIndexedEvent);

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
    expect(eventTypes[BitcoinIndexerTransactionsBatchIndexedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerBlockIndexedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerChainBlockAddedEvent.name]).toBe(1);

    // Check that there are two events for 'indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'indexer');
    expect(indexerEvents.length).toBe(2);
    expect(indexerEvents[0].version).toBe(1);
    expect(indexerEvents[1].version).toBe(2);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check block data correctness for the event with aggregateId equal to block hash
    const blockEvent = events.find((event) => event.aggregateId === mockBlocks[0].hash);
    expect(blockEvent).toBeDefined();
    const blockPayload = JSON.parse(blockEvent.payload);
    expect(blockPayload.block.height).toBe(mockBlocks[0].height);
    expect(blockPayload.block.hash).toBe(mockBlocks[0].hash);

    // Check if the transactions batch event has transactions and their data
    const batchEvent = events.find((event) => event.type === BitcoinIndexerTransactionsBatchIndexedEvent.name);
    expect(batchEvent).toBeDefined();
    const batchPayload = JSON.parse(batchEvent.payload);
    expect(batchPayload.batch.tx.length).toBeGreaterThan(0);

    // Make sure the first transaction exists and check its txid
    expect(batchPayload.batch.tx[0].txid).toBe(mockBlocks[0].tx[0].txid);
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
          txid: record.transactionTxid,
          status: record.transactionStatus,
          vin: JSON.parse(record.transactionVin), // Parse JSON string to object
          vout: JSON.parse(record.transactionVout), // Parse JSON string to object
        });
      }
    });

    const blockList: any = Object.values(blocks);

    // Check the number of blocks and transactions saved
    expect(blockList.length).toBe(1);
    expect(blockList[0].transactions.length).toBe(1);

    // Verify block data using mockBlocks
    const expectedBlock = mockBlocks[0];
    expect(blockList[0].hash).toBe(expectedBlock.hash);
    expect(blockList[0].status).toBe('indexed');

    // Verify transaction data using mockBlocks
    const expectedTransaction = expectedBlock.tx[0];
    const savedTransaction = blockList[0].transactions[0];
    expect(savedTransaction.txid).toBe(expectedTransaction.txid);
    expect(savedTransaction.status).toBe('indexed');
    expect(savedTransaction.vin).toEqual(expectedTransaction.vin);
    expect(savedTransaction.vout).toEqual(expectedTransaction.vout);
  });
});
