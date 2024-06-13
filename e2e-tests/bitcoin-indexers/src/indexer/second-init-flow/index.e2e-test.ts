import 'reflect-metadata';
import { resolve, join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { config } from 'dotenv';
import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import { SQLiteService } from '../../helpers/sqlite/sqlite.service';
import { mockIndexerEvent } from './mocks/indexer-event';


describe('/Second Initialization Application Write State Checkin', () => {
  let app: INestApplication;
  let dbService: SQLiteService;

  beforeAll(async () => {
    jest.useFakeTimers();
    const eventEmitter = new EventEmitter();

    // Mock the BlocksQueueService with runQueue() method
    const mockBlocksQueueService = {
      runQueue: jest.fn().mockImplementation(async (height: bigint | string | number) => {
        // Emit an event to signal that runQueue was called
        eventEmitter.emit('runQueueCalled');
        }),
    };

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
    config({ path: resolve(process.cwd(), 'src/indexer/second-init-flow/.env') });

    // We want to prepare a database, with an event as if there was already an aggregate there
    // IMPORTANT: it must be before create Test nestjs app
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await dbService.initializeDatabase(resolve(process.cwd(), 'src/indexer/second-init-flow/dump.sql'));
    const eventKeys = Object.keys(mockIndexerEvent);
    const eventValues = Object.values(mockIndexerEvent).map(value => value === null ? 'NULL' : typeof value === 'string' ? `'${value}'` : value);
    await dbService.exec(`INSERT INTO events (${eventKeys.join(', ')}) VALUES (${eventValues.join(', ')})`);
    await dbService.close();

    const indexer = await BitcoinIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test
      .createTestingModule({ imports: [rootModule] })
      .overrideProvider('BlocksQueueService')
      .useValue(mockBlocksQueueService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Create a promise to wait for the event
    // Set up the event listener before app.init()
    const runQueueCalled = new Promise<void>((resolve) => {
      eventEmitter.once('runQueueCalled', resolve);
    });

    await app.init();
    
    jest.runAllTimersAsync();

    // Wait for the startBlocksLoading() method
    await runQueueCalled;

    // We wait until startBlocksLoadingCalled() will be executed
    // This is because we want to test an app that has already initialized and stopped
    await app.close();
  });

  it('/healthcheck (GET)', async () => {
    await supertest(app.getHttpServer())
      .get('/bitcoin-indexer/healthcheck')
      .expect(200);
  });

  it('should restore correct old indexer aggregate', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await dbService.connect();

    // Check if the indexer aggregate is created
    const events = await dbService.all(`SELECT * FROM events WHERE aggregateId = 'indexer'`);

    expect(events.length).toBe(2);
    expect(events[1].aggregateId).toBe('indexer');
    expect(events[1].version).toBe(2);
    expect(events[1].type).toBe('BitcoinIndexerInitializedEvent');

    const payload = JSON.parse(events[1].payload);
    expect(payload.status).toBe('awaiting');
    expect(payload.height).toBe('-1');
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
