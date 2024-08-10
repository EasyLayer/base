import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { take, Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/base';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import { BitcoinBalancesIndexerTransactionsBatchIndexedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { CustomEventBus, ofType, CqrsModule, UnhandledExceptionBus } from '@easylayer/core/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';
import { mockBlocks } from './mocks/one-block';
import { InputsReadService } from '@easylayer/plugin-bitcoin-balances-indexer/dist/domain-layer/services/inputs-read.service';

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

// IMPORTANT: In this test we test error throws with event handlers and mock the error Bus.
// This is because our current implementation is such that
// event handler throws crash the application, so we mock methods here so that the tests don't fail.
class MockUnhandledExceptionBus {
  publish = jest.fn().mockImplementation(() => {});
  subscribe = jest.fn().mockImplementation(() => {});
}

describe('/Check Transactional Isolation Between Write and Read States', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;
  let inputsReadService: InputsReadService;

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
    await cleanDataFolder('easylayer/data');

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/balances-indexer/check-transactional/.env') });

    const indexer = await BitcoinBalancesIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-balances-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [rootModule],
    })
      .overrideProvider(UnhandledExceptionBus)
      .useClass(MockUnhandledExceptionBus)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    // IMPORTANT: We need EventBus to handle when event will be happend,
    // get EventBus from nest we can't for some reason
    // (It is some bug, when we replaced old EventBus in nestjs/cqrs by our new CustomEventBus,
    // nest doesn't allow us to get the new one, only old)
    // so we get crqs module from nest and then eventbus (CustomEventBus) from cqrs.
    const cqrs: any = app.get<CqrsModule>(CqrsModule);
    eventBus = cqrs.eventBus;
    inputsReadService = app.get(InputsReadService);

    jest.spyOn(inputsReadService, 'createMany').mockImplementation(() => {
      return Promise.reject(new Error('Test error from createMany'));
    });

    const createEventPromise = (eventType: any): Promise<void> => {
      return new Promise<void>((resolve) => {
        if (!(eventBus.eventHandlerCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.eventHandlerCompletionSubject$ is not Observable');
        }

        eventBus.eventHandlerCompletionSubject$.pipe(ofType(eventType), take(1)).subscribe({
          next: () => resolve(),
          // In these tests we get the expected error here,
          // so to prevent the failing of tests we put resolve() here
          error: () => resolve(),
        });
      });
    };

    await createEventPromise(BitcoinBalancesIndexerTransactionsBatchIndexedEvent);
    await app.close();
  });

  it('should save events at write state correctly', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/balances-indexer-write.db') });
    await dbService.connect();

    // Get aggregates events
    const events = await dbService.all(`SELECT * FROM events`);

    // Group events by type and test that each type of event is only called once
    const eventTypes = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    expect(eventTypes[BitcoinBalancesIndexerTransactionsBatchIndexedEvent.name]).toBe(1);

    // Checking the state of the read database
    dbService.close();
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/balances-indexer-read.db') });
    dbService.connect();

    // Fetch outputs from the database
    const outputs = await dbService.all(`
      SELECT * 
      FROM outputs
    `);

    // Check that the read database is empty due to a transaction rollback
    expect(outputs.length).toBe(0);
  });
});
