import 'reflect-metadata';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { config } from 'dotenv';
import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

describe('/First Initialization Application Write State Checkin', () => {
  let app: INestApplication;
  let dbService: SQLiteService;

  beforeAll(async () => {
    jest.useFakeTimers();
    const eventEmitter = new EventEmitter();

    // Mock the TransactionsQueueService with start() method
    const mockTransactionsQueueService = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      start: jest.fn().mockImplementation(async (height: string | number) => {
        // Emit an event to signal that start() was called
        eventEmitter.emit('startCalled');
      }),
    };

    // Clear the database
    await cleanDataFolder();

    // Initialize transactional context before any database interaction
    initializeTransactionalContext();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/balances-indexer/first-init-flow/.env') });

    const indexer = await BitcoinBalancesIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-balances-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] })
      .overrideProvider('TransactionsQueueService')
      .useValue(mockTransactionsQueueService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Create a promise to wait for the event
    // Set up the event listener before app.init()
    const startCalled = new Promise<void>((resolve) => {
      eventEmitter.once('startCalled', resolve);
    });

    await app.init();

    jest.runAllTimersAsync();

    // Wait for the startBlocksLoading() method
    await startCalled;

    // We wait until startBlocksLoadingCalled() will be executed
    // This is because we want to test an app that has already initialized and stopped
    await app.close();
  });

  it('/healthcheck (GET)', async () => {
    await supertest(app.getHttpServer()).get('/bitcoin-balances-indexer/healthcheck').expect(200);
  });

  it('should create new indexer aggregate', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-write.db') });
    await dbService.connect();

    // Check if the balances-indexer aggregate is created
    const events = await dbService.all(`SELECT * FROM events WHERE aggregateId = 'balances-indexer'`);

    expect(events.length).toBe(1);
    expect(events[0].aggregateId).toBe('balances-indexer');
    expect(events[0].version).toBe(1);
    expect(events[0].type).toBe('BitcoinBalancesIndexerInitializedEvent');

    const payload = JSON.parse(events[0].payload);
    expect(payload.status).toBe('awaiting');
    expect(payload.indexedHeight).toBe('9');
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
