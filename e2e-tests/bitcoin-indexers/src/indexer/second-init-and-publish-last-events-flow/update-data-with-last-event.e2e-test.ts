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
import { mockEvents } from './mocks/events';
import { mockBlocks, mockTransactions } from './mocks/view-models';

describe('/Second Initialization Application And Publish Last Events Of Indexing Status', () => {
  let app: INestApplication;
  let writeDbService: SQLiteService;
  let readDbService: SQLiteService;
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

    writeDbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-write.db') });
    await writeDbService.initializeDatabase(
      resolve(process.cwd(), 'src/indexer/second-init-and-publish-last-events-flow/write-db.sql'),
    );

    for (const event of mockEvents) {
      const eventKeys = Object.keys(event);
      const eventValues = Object.values(event).map((value) =>
        value === null ? 'NULL' : typeof value === 'string' ? `'${value}'` : value,
      );
      await writeDbService.exec(`INSERT INTO events (${eventKeys.join(', ')}) VALUES (${eventValues.join(', ')})`);
    }

    await writeDbService.close();

    readDbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-read.db') });
    await readDbService.initializeDatabase(
      resolve(process.cwd(), 'src/indexer/second-init-and-publish-last-events-flow/read-db.sql'),
    );

    for (const block of mockBlocks) {
      const keys = Object.keys(block).join(', ');
      const values = Object.values(block)
        .map((v) => (typeof v === 'string' ? `'${v}'` : v))
        .join(', ');
      await readDbService.exec(`INSERT INTO blocks (${keys}) VALUES (${values})`);
    }

    for (const transaction of mockTransactions) {
      const keys = Object.keys(transaction).join(', ');
      const values = Object.values(transaction)
        .map((v) => (typeof v === 'string' ? `'${v}'` : v))
        .join(', ');
      await readDbService.exec(`INSERT INTO transactions (${keys}) VALUES (${values})`);
    }
    await readDbService.close();

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

  it('should update the latest event data in the read db while maintaining relations', async () => {
    // Connect to the read database
    readDbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-read.db') });
    await readDbService.connect();

    // Fetch blocks with their transactions
    const blocksWithTransactions = await readDbService.all(`
      SELECT 
        b.hash AS blockHash, 
        b.status AS blockStatus,
        t.txid AS transactionTxid,
        t.status AS transactionStatus
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
          hash: record.transactionHash,
          value: record.transactionValue,
          scriptSig: record.transactionScriptSig,
          scriptPubKey: record.transactionScriptPubKey,
        });
      }
    });

    const blockList: any = Object.values(blocks);

    const expectedBlock = mockBlocks[1];
    const expectedTx = mockTransactions[1];

    // Check the number of blocks and transactions saved
    expect(blockList.length).toBe(2);
    expect(blockList[0].transactions.length).toBe(1);
    expect(blockList[1].transactions.length).toBe(1);

    expect(blockList[1].hash).toBe(expectedBlock.hash);
    expect(blockList[1].status).toBe(expectedBlock.status);

    expect(blockList[1].transactions[0].txid).toBe(expectedTx.txid);
  });

  afterAll(async () => {
    if (app) {
      try {
        await app.close();
      } catch (error) {
        console.error(error);
      }
    }
    if (writeDbService) {
      try {
        await writeDbService.close();
      } catch (error) {
        console.error(error);
      }
    }
    if (readDbService) {
      try {
        await readDbService.close();
      } catch (error) {
        console.error(error);
      }
    }
  });
});
