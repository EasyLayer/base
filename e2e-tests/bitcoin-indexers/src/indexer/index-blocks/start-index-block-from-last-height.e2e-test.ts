import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable, take } from 'rxjs';
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
import { mockBlocks, mockEvents } from './mocks/one-block-events-and-two-blocks';
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

describe('/Start Index Block From Last Height', () => {
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

    // We want to prepare a database, with an event as if there was already an aggregate there
    // IMPORTANT: it must be before create Test nestjs app
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await dbService.initializeDatabase(resolve(process.cwd(), 'src/+dumps/events-table.sql'));
    for (const event of mockEvents) {
      const eventKeys = Object.keys(event);
      const eventValues = Object.values(event).map((value) =>
        value === null ? 'NULL' : typeof value === 'string' ? `'${value}'` : value,
      );
      await dbService.exec(`INSERT INTO events (${eventKeys.join(', ')}) VALUES (${eventValues.join(', ')})`);
    }
    await dbService.close();

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

    expect(eventTypes[BitcoinIndexerInitializedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinIndexerTransactionsBatchIndexedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinIndexerBlockIndexedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinIndexerChainBlockAddedEvent.name]).toBe(2);

    // Check that there are three events for 'indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'indexer');
    expect(indexerEvents.length).toBe(4);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check first block data correctness for the event with aggregateId equal to block hash
    const blockEvent = events.find((event) => event.aggregateId === mockBlocks[1].hash);
    expect(blockEvent).toBeDefined();
    const blockPayload = JSON.parse(blockEvent.payload);
    expect(blockPayload.block.height).toBe(mockBlocks[1].height);
    expect(blockPayload.block.hash).toBe(mockBlocks[1].hash);

    // Check if the transactions batch event has transactions and their data
    const batchEvents = events.filter((event) => event.type === BitcoinIndexerTransactionsBatchIndexedEvent.name);
    expect(batchEvents.length).toBe(2);

    // Concatenate all transactions from batch events
    const allBatchTransactions = batchEvents.flatMap((batchEvent) => JSON.parse(batchEvent.payload).batch.tx);

    // Check that transactions from mockBlocks are in the same order in batch events
    const allMockTransactions = [...mockBlocks[0].tx, ...mockBlocks[1].tx];
    expect(allBatchTransactions.length).toBe(allMockTransactions.length);

    allBatchTransactions.forEach((transaction, index) => {
      expect(transaction.txid).toBe(allMockTransactions[index].txid);
    });
  });
});
