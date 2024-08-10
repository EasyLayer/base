import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { CoreModule } from '@easylayer/base';
import BitcoinIndexer from '@easylayer/plugin-bitcoin-indexer';
import {
  BitcoinIndexerBlockIndexedEvent,
  BitcoinIndexerInitializedEvent,
  BitcoinIndexerTransactionsBatchIndexedEvent,
  BitcoinIndexerChainBlockAddedEvent,
  BitcoinIndexerReorganisationFinishedEvent,
  BitcoinIndexerReorganisationStartedEvent,
  BitcoinIndexerBlockSuspendedEvent,
  BitcoinIndexerTransactionsBatchSuspendedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-indexer';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/core/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { commonBlock, mockFakeChainBlocks, mockRealChainBlocks } from './mocks/fake-and-real-blockschain';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';

jest.mock('piscina', () => {
  return jest.fn().mockImplementation(() => {
    return {
      run: jest.fn().mockImplementation(({ height }) => {
        const block = mockFakeChainBlocks.find((block) => BigInt(block.height) === BigInt(height));
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

describe('/Reorganise(Suspend) Three Blocks When the Wrong Chain Was Specified', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;
  let providerService: BitcoinNetworkProviderService;

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
    config({ path: resolve(process.cwd(), 'src/indexer/reorganisation-blocks/.env') });

    const indexer = await BitcoinIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    providerService = app.get<BitcoinNetworkProviderService>(BitcoinNetworkProviderService);

    // NOTE: We mock the provider's method to get the correct blocks from our mockRealChainBlocks
    jest.spyOn(providerService, 'getOneBlockByHeight').mockImplementation(async (height: string | bigint | number) => {
      return mockRealChainBlocks.find((block) => block.height === Number(height));
    });

    // IMPORTANT: We need EventBus to handle when event will be happend,
    // get EventBus from nest we can't for some reason
    // (It is some bug, when we replaced old EventBus in nestjs/cqrs by our new CustomEventBus,
    // nest doesn't allow us to get the new one, only old)
    // so we get crqs module from nest and then eventbus (CustomEventBus) from cqrs.
    const cqrs: any = app.get<CqrsModule>(CqrsModule);
    eventBus = cqrs.eventBus;

    const createEventHandlerCompletionPromise = (eventType: any, expectedCount: number): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (!(eventBus.eventHandlerCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.eventHandlerCompletionSubject$ is not Observable');
        }

        // IMPORTANT: This counter is needed so that we index several blocks batches
        // and not stop at the first ones
        let eventCount = 0;

        eventBus.eventHandlerCompletionSubject$.pipe(ofType(eventType)).subscribe({
          next: () => {
            eventCount++;
            if (eventCount >= expectedCount) {
              resolve();
            }
          },
          error: (err: any) => reject(err),
        });
      });
    };

    const createSagasCompletionPromise = (eventType: any): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (!(eventBus.sagaCompletionSubject$ instanceof Observable)) {
          throw new Error('eventBus.sagaCompletionSubject$ is not Observable');
        }

        eventBus.sagaCompletionSubject$.pipe(ofType(eventType)).subscribe({
          next: () => resolve(),
          error: (err: any) => reject(err),
        });
      });
    };

    const callIndexerPromise = createSagasCompletionPromise(BitcoinIndexerReorganisationFinishedEvent);
    const saveBlockPromise = createEventHandlerCompletionPromise(BitcoinIndexerBlockSuspendedEvent, 2); // 2 blocks

    await Promise.all([callIndexerPromise, saveBlockPromise]);
    await app.close();
  });

  it('should save events of suspend aggregates correctly', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/indexer-write.db') });
    await dbService.connect();

    // Get aggregates events
    const events = await dbService.all(`SELECT * FROM events`);

    // Group events by type and test that each type of event is only called once
    const eventTypes = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    expect(eventTypes[BitcoinIndexerInitializedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerTransactionsBatchIndexedEvent.name]).toBe(3);
    expect(eventTypes[BitcoinIndexerBlockIndexedEvent.name]).toBe(3);
    expect(eventTypes[BitcoinIndexerChainBlockAddedEvent.name]).toBe(3);
    expect(eventTypes[BitcoinIndexerReorganisationFinishedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerReorganisationStartedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinIndexerBlockSuspendedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinIndexerTransactionsBatchSuspendedEvent.name]).toBe(2);

    // Check that there are six events for 'indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'indexer');
    expect(indexerEvents.length).toBe(6);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check first block data correctness for the event with aggregateId equal to block hash
    const blockEvent0 = events.find((event) => event.aggregateId === commonBlock.hash);
    expect(blockEvent0).toBeDefined();
    const blockPayload0 = JSON.parse(blockEvent0.payload);
    expect(blockPayload0.block.height).toBe(commonBlock.height);
    expect(blockPayload0.block.hash).toBe(commonBlock.hash);

    // Check statuses for all blocks except the first one to be 'suspended'
    const suspendedBlockEvents = events.filter(
      (event) => event.type === BitcoinIndexerBlockSuspendedEvent.name && event.aggregateId !== commonBlock.hash,
    );
    // Excluding the commonBlock and -1 last fake block
    expect(suspendedBlockEvents.length).toBe(mockFakeChainBlocks.length - 1 - 1);

    suspendedBlockEvents.forEach((event) => {
      const payload = JSON.parse(event.payload);
      expect(payload.status).toBe('suspended');
    });

    // Check statuses for all transaction batches except those related to the first block to be 'suspended'
    const allBatches = mockFakeChainBlocks.flatMap((block) => block.tx.map((tx) => tx.txid));
    const suspendedBatchEvents = events.filter(
      (event) =>
        event.type === BitcoinIndexerTransactionsBatchSuspendedEvent.name && !allBatches.includes(event.aggregateId),
    );
    // Excluding the commonBlock batches and - 1 last fake block
    expect(suspendedBatchEvents.length).toBe(allBatches.length - commonBlock.tx.length - 1);

    suspendedBatchEvents.forEach((event) => {
      const payload = JSON.parse(event.payload);
      expect(payload.status).toBe('suspended');
    });
  });

  it('should update block and transactions with suspend status into read db', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/indexer-read.db') });
    await dbService.connect();

    // Fetch blocks with their transactions
    const blocksWithTransactions = await dbService.all(`
      SELECT
        b.hash AS blockHash,
        b.status AS blockStatus,
        t.id as transactionId,
        t.txid AS transactionTxid,
        t.status AS transactionStatus,
        t.vin AS transactionVin,
        t.vout AS transactionVout
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
          id: record.transactionId,
          txid: record.transactionTxid,
          status: record.transactionStatus,
        });
      }
    });

    // Sort transactions within each block by 'id' to ensure order
    Object.values(blocks).forEach((block: any) => {
      block.transactions.sort((a: any, b: any) => a.id - b.id);
    });

    const blockList: any = Object.values(blocks);

    // Check the number of blocks and transactions saved
    // - 1 this is last one that wasn't be added
    expect(blockList.length).toBe(mockFakeChainBlocks.length - 1);

    // Verify first block(common block) data using mockFakeChainBlocks
    expect(blockList[0].hash).toBe(commonBlock.hash);
    expect(blockList[0].status).toBe('indexed');

    // Verify remaining blocks data using mockFakeChainBlocks
    // - 1 this is last one that wasn't be added
    // start from i = 1 (without common block)
    for (let i = 1; i < mockFakeChainBlocks.length - 1; i++) {
      const expectedBlock = mockFakeChainBlocks[i];
      const savedBlock = blockList.find((block: any) => block.hash === expectedBlock.hash);
      expect(savedBlock).toBeDefined();
      expect(savedBlock.hash).toBe(expectedBlock.hash);
      expect(savedBlock.status).toBe('suspended');

      // Verify transactions for the suspended blocks
      const expectedTransactions = expectedBlock.tx;
      const savedTransactions = savedBlock.transactions;

      expect(savedTransactions.length).toBe(expectedTransactions.length);
      expectedTransactions.forEach((expectedTx: any, index: number) => {
        const savedTx = savedTransactions[index];
        expect(savedTx.txid).toBe(expectedTx.txid);
        expect(savedTx.status).toBe('suspended');
      });
    }
  });
});
