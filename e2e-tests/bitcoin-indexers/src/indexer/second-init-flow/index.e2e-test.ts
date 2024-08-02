import 'reflect-metadata';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { config } from 'dotenv';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/base';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { mockIndexerEvent } from './mocks/indexer-event';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

describe('/Second Initialization Application Write State Checkin', () => {
  let app: INestApplication;
  let dbService: SQLiteService;

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
    jest.useFakeTimers();
    const eventEmitter = new EventEmitter();

    // Mock the BlocksQueueService with start() method
    const mockBlocksQueueService = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      start: jest.fn().mockImplementation(async (height: string | number) => {
        // Emit an event to signal that start() was called
        eventEmitter.emit('startCalled');
      }),
    };

    // Clear the database
    await cleanDataFolder();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/indexer/second-init-flow/.env') });

    // We want to prepare a database, with an event as if there was already an aggregate there
    // IMPORTANT: it must be before create Test nestjs app
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await dbService.initializeDatabase(resolve(process.cwd(), 'src/+dumps/events-table.sql'));
    const eventKeys = Object.keys(mockIndexerEvent);
    const eventValues = Object.values(mockIndexerEvent).map((value) =>
      value === null ? 'NULL' : typeof value === 'string' ? `'${value}'` : value,
    );
    await dbService.exec(`INSERT INTO events (${eventKeys.join(', ')}) VALUES (${eventValues.join(', ')})`);
    await dbService.close();

    const indexer = await BitcoinIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] })
      .overrideProvider('BlocksQueueService')
      .useValue(mockBlocksQueueService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Create a promise to wait for the event
    // Set up the event listener before app.init()
    const startCalled = new Promise<void>((resolve) => {
      eventEmitter.once('startCalled', resolve);
    });

    await app.init();

    jest.runAllTimersAsync();

    // Wait for the startCalled() method
    await startCalled;

    // We wait until startCalled() will be executed
    // This is because we want to test an app that has already initialized and stopped
    await app.close();
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
    expect(payload.indexedHeight).toBe('-1');
  });
});
