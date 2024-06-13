import 'reflect-metadata';
import { resolve, join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import { config } from 'dotenv';
import supertest from 'supertest';
import { take, Observable, tap } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import {
  BitcoinBlockWithCompleteIndexedEvent,
  BitcoinIndexerInitializedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent,
  BitcoinIndexerBlockWithConfirmAddedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../helpers/sqlite/sqlite.service';
import { mockBlocks } from './mocks/blocks';

jest.mock('piscina', () => {
  return jest.fn().mockImplementation(() => {
    return {
      run: jest.fn().mockImplementation(({ height }) => {
        const block = mockBlocks.find(block => BigInt(block.height) === BigInt(height));
        if (!block) {
          return Promise.reject(new Error(`Block with height ${height} not found`));
        }
        return Promise.resolve(block);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      options: {
        maxThreads: process.env.BITCOIN_INDEXER_BLOCKS_QUEUE_WORKERS_NUM
      }
    };
  });
});

describe('/Index One Block with Immediately Confirm Write State Checkin', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;

  beforeAll(async () => {
    jest.useFakeTimers({ advanceTimers: true })

    // Clear the database
    const dataDir = resolve(process.cwd(), 'data');
    try {
      const files = await readdir(dataDir);
      const unlinkPromises = files.map(file => unlink(join(dataDir, file)));
      await Promise.all(unlinkPromises);
    } catch (err) {
      console.error('Failed to clean data directory', err);
    }

    // Initialize transactional context before any database interaction
    initializeTransactionalContext();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/indexer/index-one-block-with-immediately-confirm/.env') });

    const indexer = await BitcoinIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test
      .createTestingModule({ imports: [rootModule] })
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    // IMPORTANT: We need EventBus to handle when event wiil be happend, 
    // get EventBus from nest we can't for some reason
    // (It is some bug, when we replaced old EventBus in nestjs/cqrs by our new CustomEventBus, 
    // nest doesn't allow us to get the new one, only old)
    // so we get crqs module from nest and then eventbus (CustomEventBus) from cqrs. 
    const cqrs: any = app.get<CqrsModule>(CqrsModule);
    eventBus = cqrs.eventBus;

    const eventPromise = new Promise<void>((resolve, reject) => {
      if (!(eventBus.subject$ instanceof Observable)) {
        throw new Error('eventBus.subject$ is not Observable');
      }

      eventBus.subject$
        .pipe(
          ofType(BitcoinBlockWithCompleteIndexedEvent),
          take(1)
        )
        .subscribe({
          next: () =>  resolve(),
          error: (err: any) => reject(err)
        });
    });

    // Wait when event to hit EventBus
    await eventPromise;
  
    await app.close();
  });

  it('/healthcheck (GET)', async () => {
    await supertest(app.getHttpServer())
      .get('/bitcoin-indexer/healthcheck')
      .expect(200);
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
    expect(eventTypes[BitcoinTransactionsBatchWithIndexCreatedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerBlockWithConfirmAddedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinBlockWithCompleteIndexedEvent.name]).toBe(1);

    // Check that there are two events for 'indexer' and their versions
    const indexerEvents = events.filter(event => event.aggregateId === 'indexer');
    expect(indexerEvents.length).toBe(2);
    expect(indexerEvents[0].version).toBe(1);
    expect(indexerEvents[1].version).toBe(2);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check block data correctness for the event with aggregateId equal to block hash
    const blockEvent = events.find(event => event.aggregateId === mockBlocks[0].hash);
    expect(blockEvent).toBeDefined();
    const blockPayload = JSON.parse(blockEvent.payload);
    expect(blockPayload.block.height).toBe(mockBlocks[0].height);
    expect(blockPayload.block.hash).toBe(mockBlocks[0].hash);

    // Check if the transactions batch event has transactions and their data
    const batchEvent = events.find(event => event.type === BitcoinTransactionsBatchWithIndexCreatedEvent.name);
    expect(batchEvent).toBeDefined();
    const batchPayload = JSON.parse(batchEvent.payload);
    expect(batchPayload.batch.transactions.length).toBeGreaterThan(0);
    expect(batchPayload.batch.transactions[0].txid).toBe(mockBlocks[0].tx[0].txid);
  });

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
});
