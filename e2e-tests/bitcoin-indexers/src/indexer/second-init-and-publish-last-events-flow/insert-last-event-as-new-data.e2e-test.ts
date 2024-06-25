import 'reflect-metadata';
import { resolve, join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import { config } from 'dotenv';
import { take, Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import {
  BitcoinBlockWithCompleteIndexedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../helpers/sqlite/sqlite.service';
import { mockEvents, mockBlocksEvents } from './mocks/events';

describe('/Second Initialization Application And Publish Last Events Of Awaiting Status', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;

  beforeAll(async () => {
    jest.useFakeTimers({ advanceTimers: true });

    // Clear the database
    const dataDir = resolve(process.cwd(), 'data');
    try {
      const files = await readdir(dataDir);
      const unlinkPromises = files.map((file) => unlink(join(dataDir, file)));
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
    await dbService.initializeDatabase(
      resolve(process.cwd(), 'src/indexer/second-init-and-publish-last-events-flow/write-db.sql'),
    );

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

    const saveBlockPromise = createEventPromise(BitcoinBlockWithCompleteIndexedEvent);
    const saveTransactionsBatchPromise = createEventPromise(BitcoinTransactionsBatchWithIndexCreatedEvent);

    await Promise.all([saveBlockPromise, saveTransactionsBatchPromise]);

    await app.close();
  });

  it('should exist in the read database', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-read.db') });
    await dbService.connect();

    const expectedBlock = mockBlocksEvents['00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206'];
    // const expectedTransaction = mockTransactionsBatchesEvents['db54bcbc-2bfd-4b45-8093-60a40a75bde2'];

    // Fetch the block and its transactions separately to verify the relationship
    const fetchedBlock: any = await dbService.all(`SELECT * FROM blocks WHERE hash = ?`, [expectedBlock.aggregateId]);
    const fetchedTransactions: any = await dbService.all(`SELECT * FROM transactions WHERE blockHash = ?`, [
      expectedBlock.aggregateId,
    ]);

    // Check the number of blocks and transactions saved
    expect(fetchedBlock.length).toBe(1);
    expect(fetchedTransactions.length).toBe(1);
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
