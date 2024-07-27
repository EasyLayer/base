import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { CoreModule } from '@easylayer/core';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import {
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerTransactionsBatchSuspendedEvent,
  BitcoinBalancesIndexerBlockAddedEvent,
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerTransactionsBatchIndexedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';
import { mockFakeChainBlocks, mockRealChainBlocks } from './mocks/fake-and-real-blockschain';

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

describe('/Reorganise(Suspend) Two Blocks When the Wrong Chain Was Specified', () => {
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
    await cleanDataFolder();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/balances-indexer/reorganisation-blocks/.env') });

    const indexer = await BitcoinBalancesIndexer.register();

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

    const callIndexerPromise = createSagasCompletionPromise(BitcoinBalancesIndexerReorganisationFinishedEvent);
    const saveBatchPromise = createEventHandlerCompletionPromise(
      BitcoinBalancesIndexerTransactionsBatchSuspendedEvent,
      1,
    ); // 1 block
    await Promise.all([callIndexerPromise, saveBatchPromise]);
    await app.close();
  });

  it('should save events of suspend aggregates correctly', async () => {
    // Connect to the write database (event store)
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-write.db') });
    await dbService.connect();

    // Get aggregates events
    const events = await dbService.all(`SELECT * FROM events`);

    // Group events by type and test that each type of event is only called once
    const eventTypes = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    expect(eventTypes[BitcoinBalancesIndexerInitializedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinBalancesIndexerTransactionsBatchIndexedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinBalancesIndexerBlockAddedEvent.name]).toBe(2);
    expect(eventTypes[BitcoinBalancesIndexerReorganisationFinishedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinBalancesIndexerReorganisationStartedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinBalancesIndexerTransactionsBatchSuspendedEvent.name]).toBe(1);

    // Check that there are six events for 'balances-indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'balances-indexer');
    expect(indexerEvents.length).toBe(5);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check statuses for all transaction batches except those related to the first block to be 'suspended'
    const allBatches = mockFakeChainBlocks.flatMap((block) => block.tx.map((tx) => tx.txid));
    const suspendedBatchEvents = events.filter(
      (event) =>
        event.type === BitcoinBalancesIndexerTransactionsBatchSuspendedEvent.name &&
        !allBatches.includes(event.aggregateId),
    );
    // Excluding the commonBlock batches and - 1 last fake block
    expect(suspendedBatchEvents.length).toBe(1);

    suspendedBatchEvents.forEach((event) => {
      const payload = JSON.parse(event.payload);
      expect(payload.status).toBe('suspended');
    });
  });

  it('should update utxo with suspend status into read db', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-read.db') });
    await dbService.connect();

    // Fetch all outputs and their related transactions
    const outputsWithTransactions = await dbService.all(`
      SELECT
        o.txid AS outputTxid,
        o.n AS outputN,
        o.is_suspended AS outputSuspended,
        i.txid AS inputTxid,
        i.output_txid AS inputOutputTxid,
        i.output_n AS inputOutputN
      FROM
        outputs o
      LEFT JOIN
        inputs i ON o.txid = i.output_txid AND o.n = i.output_n
    `);

    // Group outputs by transaction
    const transactions: any = {};
    outputsWithTransactions.forEach((record: any) => {
      if (!transactions[record.outputTxid]) {
        transactions[record.outputTxid] = {
          txid: record.outputTxid,
          isSuspended: record.outputSuspended,
          inputs: [],
        };
      }
      if (record.inputTxid) {
        transactions[record.outputTxid].inputs.push({
          txid: record.inputTxid,
          outputTxid: record.inputOutputTxid,
          outputN: record.inputOutputN,
        });
      }
    });

    const transactionList: any = Object.values(transactions);

    // Check the number of transactions saved
    expect(transactionList.length).toBeGreaterThan(0);

    // Verify transactions data using mockFakeChainBlocks
    transactionList.forEach((transaction: any) => {
      const mockBlock = mockFakeChainBlocks.find((block) => block.tx.some((tx) => tx.txid === transaction.txid))!;
      expect(mockBlock).toBeDefined();

      const mockTransaction = mockBlock.tx.find((tx) => tx.txid === transaction.txid);
      expect(mockTransaction).toBeDefined();

      // Check outputs
      if (mockBlock.height > 0) {
        expect(transaction.isSuspended).toBeTruthy();
      } else {
        expect(transaction.isSuspended).toBeFalsy();
      }
    });
  });
});
