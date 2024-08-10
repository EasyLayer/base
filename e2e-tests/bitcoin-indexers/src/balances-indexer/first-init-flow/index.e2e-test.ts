import 'reflect-metadata';
import { resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { config } from 'dotenv';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/base';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

describe('/First Initialization Application Write State Checkin', () => {
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
    jest.useFakeTimers({ advanceTimers: true });
    const eventEmitter = new EventEmitter();

    // Mock the mockBLocksQueueService with start() method
    const mockBLocksQueueService = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      start: jest.fn().mockImplementation(async (height: string | number) => {
        // Emit an event to signal that start() was called
        eventEmitter.emit('startCalled');
      }),
    };

    // Clear the database
    await cleanDataFolder('easylayer/data');

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/balances-indexer/first-init-flow/.env') });

    const indexer = await BitcoinBalancesIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-balances-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] })
      .overrideProvider('BlocksQueueService')
      .useValue(mockBLocksQueueService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Create a promise to wait for the event
    // Set up the event listener before app.init()
    const startCalled = new Promise<void>((resolve) => {
      eventEmitter.once('startCalled', resolve);
    });

    await app.init();

    // Wait for the startBlocksLoading() method
    await startCalled;

    // We wait until startBlocksLoadingCalled() will be executed
    // This is because we want to test an app that has already initialized and stopped
    await app.close();
  });

  it('should create new indexer aggregate', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/balances-indexer-write.db') });
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
});
