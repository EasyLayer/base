import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable } from 'rxjs';
// import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerTransactionsBatchIndexedEvent,
  BitcoinBalancesIndexerBlockAddedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { CustomEventBus, ofType, CqrsModule } from '@easylayer/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';
import { mockBlocks } from './mocks/three-blocks-with-eleven-tx';

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

describe('/Index Tree Batches With Ten Transactions', () => {
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

    // Calculate the size of transactions
    // IMPORTANT: We want to know how much transactions weigh
    // so that we can split them into batches from memory, for testing
    const totalSize = mockBlocks.reduce((total, block) => {
      return (
        total +
        block.tx.reduce((blockTotal, tx) => {
          return blockTotal + JSON.stringify(tx).length;
        }, 0)
      );
    }, 0);

    // How many batches do we want to get
    const numBatches = 3;
    // TODO: This division of batches may give different results twice
    // why there may be errors, you need to redo it for a specific number of transactions
    const maxBatchSize = Math.ceil(totalSize / numBatches);

    process.env.BITCOIN_BALANCES_INDEXER_MAX_TRANSACTIONS_BATCH_SIZE = maxBatchSize.toString();

    // Load environment variables
    config({ path: resolve(process.cwd(), 'src/balances-indexer/index-transactions-batches/.env') });

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

    const createEventPromise = (eventType: any, expectedCount: number): Promise<void> => {
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

    const saveBatchPromise = createEventPromise(BitcoinBalancesIndexerTransactionsBatchIndexedEvent, 4); // 3 batches

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
    expect(eventTypes[BitcoinBalancesIndexerTransactionsBatchIndexedEvent.name]).toBe(4); // Assuming 4 transactions batches
    expect(eventTypes[BitcoinBalancesIndexerBlockAddedEvent.name]).toBe(3); // 3 blocks added

    // Check that there are four events for 'balances-indexer' and their versions
    const indexerEvents = events.filter((event) => event.aggregateId === 'balances-indexer');
    expect(indexerEvents.length).toBe(4);
    expect(indexerEvents[0].version).toBe(1);
    expect(indexerEvents[1].version).toBe(2);

    // Check the status in the indexer to be 'awaiting'
    const payload0 = JSON.parse(indexerEvents[0].payload);
    expect(payload0.status).toBe('awaiting');

    // Check if the transactions batch event has transactions and their data
    const batchEvents = events.filter(
      (event) => event.type === BitcoinBalancesIndexerTransactionsBatchIndexedEvent.name,
    );
    expect(batchEvents.length).toBe(4);

    // Check the events for each batch
    batchEvents.forEach((batchEvent) => {
      const batchPayload = JSON.parse(batchEvent.payload);
      const txIds = Object.keys(batchPayload.batch.tx);
      const transactions = Object.values(batchPayload.batch.tx);

      transactions.forEach((transaction: any, index: number) => {
        const mockBlock = mockBlocks.find((block) => block.tx.some((tx) => tx.txid === txIds[index]))!;
        const mockTransaction = mockBlock.tx.find((tx) => tx.txid === txIds[index])!;

        // Check inputs
        transaction.inputs.forEach((input: any, inputIndex: any) => {
          const mockInput: any = mockTransaction.vin[inputIndex];
          if (mockInput.coinbase) {
            expect(input.txid).toBe(null);
            expect(input.vout).toBe(null);
            expect(input.coinbase).toBe(mockInput.coinbase);
          } else {
            expect(input.txid).toBe(mockInput.txid);
            expect(input.vout).toBe(mockInput.vout);
            expect(input.coinbase).toBe(null);
          }
        });

        // Check outputs
        Object.entries(transaction.outputs).forEach(([outputIndex, output]: any) => {
          const mockOutput = mockTransaction.vout[Number(outputIndex)];
          expect(output.address).toBeDefined();
          expect(output.value).toBe(mockOutput.value);
        });
      });
    });
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
        is_suspended,
        coinbase
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
    mockBlocks.forEach((block) => {
      block.tx.forEach((tx) => {
        tx.vout.forEach((vout) => {
          const savedOutput = outputs.find((output: any) => output.txid === tx.txid && output.n === vout.n);

          expect(savedOutput).toBeDefined();
          expect(savedOutput.address).toBeDefined();
          // We store value in db as Satoshi
          expect(savedOutput.value.toString()).toBe((vout.value * 100000000).toString());
          expect(savedOutput.block_height).toBe(block.height);
          expect(!!savedOutput.is_suspended).toBe(false);
        });

        tx.vin.forEach((vin: any) => {
          if (vin.coinbase) {
            const coinbaseOutput = outputs.find((output: any) => output.txid === tx.txid && output.n === -1);

            expect(coinbaseOutput).toBeDefined();
            expect(coinbaseOutput.address).toBeNull();
            expect(coinbaseOutput.value).toBeFalsy();
            expect(coinbaseOutput.block_height).toBe(block.height);
            expect(coinbaseOutput.coinbase).toBeDefined();
            expect(!!coinbaseOutput.is_suspended).toBe(false);
          }
        });
      });
    });

    // Verify inputs using mockBlocks
    mockBlocks.forEach((block) => {
      block.tx.forEach((tx) => {
        tx.vin.forEach((vin: any) => {
          let savedInput;

          if (vin.coinbase) {
            savedInput = inputs.find(
              (input: any) => input.txid === null && input.output_txid === tx.txid && input.output_n === -1,
            );

            expect(savedInput).toBeDefined();
          } else {
            savedInput = inputs.find(
              (input: any) => input.output_txid === vin.txid && input.output_n === vin.vout && input.txid === tx.txid,
            );

            expect(savedInput).toBeDefined();
          }
        });
      });
    });
  });

  it('should correctly calculate the wallet balance', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-read.db') });
    await dbService.connect();

    const getWalletBalance = async (address: string) => {
      const result = await dbService.all(
        `
        SELECT 
          COALESCE(SUM(output.value), 0) AS balance
        FROM 
          outputs output
        LEFT JOIN 
          inputs input 
        ON 
          output.txid = input.output_txid 
          AND output.n = input.output_n
        WHERE 
          output.address = ? 
          AND output.is_suspended = false 
          AND input.txid IS NULL
      `,
        [address],
      );

      return result[0].balance;
    };

    const expectedBalances: { [key: string]: number } = {
      mt4tgWuYiNAnoweSUsbfQMPENRWw72ccPh: 12500000000,
      '2N5oANkF34hZGKnVoZXukd1X6sJR7ayZPad': 7500000000,
    };

    // Verify balances using getWalletBalance function
    for (const [address, expectedBalance] of Object.entries(expectedBalances)) {
      const balance = await getWalletBalance(address);
      expect(balance).toBe(expectedBalance);
    }
  });

  it('should correctly calculate the wallet balance for specific block', async () => {
    // Connect to the read database
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'data/balances-indexer-read.db') });
    await dbService.connect();

    const getWalletBalanceUpToBlockHeight = async (address: string, blockHeight: number) => {
      const result = await dbService.all(
        `
        SELECT 
          COALESCE(SUM(output.value), 0) AS balance
        FROM 
          outputs output
        LEFT JOIN 
          inputs input 
          ON 
          output.txid = input.output_txid 
          AND output.n = input.output_n
        WHERE 
          output.address = ? 
          AND output.is_suspended = false 
          AND input.output_txid IS NULL
          AND output.block_height <= ?
      `,
        [address, blockHeight],
      );

      return result[0].balance;
    };

    const expectedBalancesAtHeight0: { [key: string]: number } = {
      mt4tgWuYiNAnoweSUsbfQMPENRWw72ccPh: 2500000000,
      '2N5oANkF34hZGKnVoZXukd1X6sJR7ayZPad': 7500000000,
    };

    const expectedBalancesAtHeight1: { [key: string]: number } = {
      mt4tgWuYiNAnoweSUsbfQMPENRWw72ccPh: 5000000000,
      '2N5oANkF34hZGKnVoZXukd1X6sJR7ayZPad': 7500000000,
    };

    const expectedBalancesAtHeight2: { [key: string]: number } = {
      mt4tgWuYiNAnoweSUsbfQMPENRWw72ccPh: 12500000000,
      '2N5oANkF34hZGKnVoZXukd1X6sJR7ayZPad': 7500000000,
    };

    // Checking balances up to block height 0
    for (const [address, expectedBalance] of Object.entries(expectedBalancesAtHeight0)) {
      const balance = await getWalletBalanceUpToBlockHeight(address, 0);
      expect(balance).toBe(expectedBalance);
    }

    // Checking balances up to block height 1
    for (const [address, expectedBalance] of Object.entries(expectedBalancesAtHeight1)) {
      const balance = await getWalletBalanceUpToBlockHeight(address, 1);
      expect(balance).toBe(expectedBalance);
    }

    // Checking balances up to block height 2
    for (const [address, expectedBalance] of Object.entries(expectedBalancesAtHeight2)) {
      const balance = await getWalletBalanceUpToBlockHeight(address, 2);
      expect(balance).toBe(expectedBalance);
    }
  });
});
