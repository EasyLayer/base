import 'reflect-metadata';
import { resolve, join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import { config } from 'dotenv';
import supertest from 'supertest';
import { take, Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import {
  BitcoinBlockWithCompleteIndexedEvent,
  BitcoinTransactionsBatchWithIndexCreatedEvent
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

describe('/Index One Block with Immediately Confirm Read State Checkin', () => {
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

    const createEventPromise = (eventType: any): Promise<void> => {
      return new Promise<void>((resolve, reject) => { 
        if (!(eventBus.eventHandlerCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.eventHandlerCompletionSubject$ is not Observable');
        }
    
        eventBus.eventHandlerCompletionSubject$
          .pipe(
            ofType(eventType),
            take(1)
          )
          .subscribe({
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

  it('/healthcheck (GET)', async () => {
    await supertest(app.getHttpServer())
      .get('/bitcoin-indexer/healthcheck')
      .expect(200);
  });
  
  it('should save new block and transactions into read db', async () => {
    // Connect to the read database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/indexer-read.db') });
    await dbService.connect();
  
    // Fetch blocks with their transactions
    const blocksWithTransactions = await dbService.all(`
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
          transactions: []
        };
      }
      if (record.transactionTxid) {
        blocks[record.blockHash].transactions.push({
          txid: record.transactionTxid,
          status: record.transactionStatus,
          hash: record.transactionHash,
          value: record.transactionValue,
          scriptSig: record.transactionScriptSig,
          scriptPubKey: record.transactionScriptPubKey
        });
      }
    });
  
    const blockList: any = Object.values(blocks);
    
    // Check the number of blocks and transactions saved
    expect(blockList.length).toBe(1);
    expect(blockList[0].transactions.length).toBe(1);
  
    // Assuming the block and transaction tables have specific fields we are interested in
    // Verify block data using mockBlocks
    const expectedBlock = mockBlocks[0];
    expect(blockList[0].hash).toBe(expectedBlock.hash);
    expect(blockList[0].status).toBe('completed');
  
    // Verify transaction data using mockBlocks
    const expectedTransaction = expectedBlock.tx[0];
    const savedTransaction = blockList[0].transactions[0];
    expect(savedTransaction.txid).toBe(expectedTransaction.txid);
    // expect(savedTransaction.hash).toBe(expectedTransaction.hash);
    // expect(savedTransaction.value).toBe(expectedTransaction.outputs[0].value);
    // expect(savedTransaction.scriptSig).toBe(expectedTransaction.inputs[0].scriptSig);
    // expect(savedTransaction.scriptPubKey).toBe(expectedTransaction.outputs[0].scriptPubKey);
  
    // Fetch the block and its transactions separately to verify the relationship
    const fetchedBlock: any = await dbService.all(`SELECT * FROM blocks WHERE hash = ?`, [expectedBlock.hash]);
    const fetchedTransactions: any = await dbService.all(`SELECT * FROM transactions WHERE blockHash = ?`, [expectedBlock.hash]);
  
    // Verify the number of fetched transactions
    expect(fetchedTransactions.length).toBe(1);
  
    // Verify the relationship between the block and its transactions
    expect(fetchedTransactions[0].blockHash).toBe(fetchedBlock[0].hash);
    expect(fetchedTransactions[0].txid).toBe(expectedTransaction.txid);
    // expect(fetchedTransactions[0].hash).toBe(expectedTransaction.hash);
    // expect(fetchedTransactions[0].value).toBe(expectedTransaction.outputs[0].value);
    // expect(fetchedTransactions[0].scriptSig).toBe(expectedTransaction.inputs[0].scriptSig);
    // expect(fetchedTransactions[0].scriptPubKey).toBe(expectedTransaction.outputs[0].scriptPubKey);
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
