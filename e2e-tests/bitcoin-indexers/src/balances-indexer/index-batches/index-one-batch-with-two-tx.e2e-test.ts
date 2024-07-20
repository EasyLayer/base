import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { take, Observable } from 'rxjs';
// import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerTransactionIndexedEvent,
  BitcoinBalancesIndexerChainBacthAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';
import { mockBlocks } from './mocks/one-block-with-one-coinbase-tx';

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
        maxThreads: process.env.BITCOIN_TRANSACTIONS_QUEUE_WORKERS_NUM,
      },
    };
  });
});

describe('/Index One Batch With One Coinbase Transaction', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;

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
    config({ path: resolve(process.cwd(), 'src/balances-indexer/index-batches/.env') });

    const indexer = await BitcoinBalancesIndexer.register();

    const rootModule = CoreModule.forRoot({
      appName: 'bitcoin-balances-indexer-test',
      plugins: [indexer],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [rootModule] }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    // IMPORTANT: We need EventBus to handle when event will be happend,
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

        eventBus.eventHandlerCompletionSubject$.pipe(ofType(eventType), take(1)).subscribe({
          next: () => resolve(),
          error: (err: any) => reject(err),
        });
      });
    };

    const saveBatchPromise = createEventPromise(BitcoinBalancesIndexerTransactionIndexedEvent);

    await Promise.all([saveBatchPromise]);

    await app.close();
  });

  it('should save events of index aggregates correctly', async () => {
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
    expect(eventTypes[BitcoinBalancesIndexerTransactionIndexedEvent.name]).toBe(1);
    expect(eventTypes[BitcoinBalancesIndexerChainBacthAddedEvent.name]).toBe(1);

    // Check that there are two events for 'balances-indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'balances-indexer');
    expect(indexerEvents.length).toBe(2);
    expect(indexerEvents[0].version).toBe(1);
    expect(indexerEvents[1].version).toBe(2);

    // Check the status in the balances-indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check tx data correctness for the event with aggregateId equal to txid
    const txEvent = events.find((event) => event.aggregateId === mockBlocks[0].tx[0].txid);
    expect(txEvent).toBeDefined();
    const txPayload = JSON.parse(txEvent.payload);

    // Check input data
    expect(txPayload.inputs[0].txid).toBe(null); // txid should be null for coinbase transaction
    expect(txPayload.inputs[0].vout).toBe(null); // vout should be null for coinbase transaction
    expect(txPayload.inputs[0].coinbase).toBe(mockBlocks[0].tx[0].vin[0].coinbase);

    // Check output data
    expect(txPayload.outputs[0].addresses).toEqual(mockBlocks[0].tx[0].vout[0].scriptPubKey.addresses);
    expect(txPayload.outputs[0].value).toBe(mockBlocks[0].tx[0].vout[0].value);

    // Check block data
    expect(txPayload.blockHeight).toBe(mockBlocks[0].height.toString());
    expect(txPayload.blockHash).toBe(mockBlocks[0].hash);

    // Additional checks for completeness
    expect(txPayload.status).toBe('completed');
  });

  it('should save new output and input into read db', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-read.db') });
    await dbService.connect();

    // Fetch outputs from the database
    const outputs = await dbService.all(`
      SELECT 
        txid, 
        n, 
        address, 
        value, 
        block_height, 
        is_suspended 
      FROM 
        outputs
    `);

    // Fetch inputs from the database
    const inputs = await dbService.all(`
      SELECT 
        txid, 
        output_txid, 
        output_n 
      FROM 
        inputs
    `);

    // Verify outputs using mockBlocks
    const expectedBlock = mockBlocks[0];
    const expectedTransaction = expectedBlock.tx[0];
    const expectedOutput = expectedTransaction.vout[0];
    // const expectedInput = expectedTransaction.vin[0];

    const mainOutput = outputs.find(
      (output: any) => output.txid === expectedTransaction.txid && output.n === expectedOutput.n,
    );

    expect(mainOutput).toBeDefined();
    expect(mainOutput.address).toBe(expectedOutput.scriptPubKey.addresses[0]);
    expect(mainOutput.value.toString()).toBe(expectedOutput.value.toString());
    expect(mainOutput.block_height).toBe(expectedBlock.height);
    expect(!!mainOutput.is_suspended).toBe(false);

    const coinbaseOutput = outputs.find((output: any) => output.txid === expectedTransaction.txid && output.n === -1);

    expect(mainOutput).toBeDefined();
    expect(coinbaseOutput.address).toBe(null);
    expect(coinbaseOutput.value.toString()).toBe('0');
    expect(coinbaseOutput.block_height).toBe(expectedBlock.height);
    expect(!!coinbaseOutput.is_suspended).toBe(false);

    // Verify coinbase input using mockBlocks
    const savedInput = inputs.find(
      (input: any) => input.output_txid === expectedTransaction.txid && input.output_n === -1 && input.txid === null,
    );

    expect(savedInput).toBeDefined();
  });
});
