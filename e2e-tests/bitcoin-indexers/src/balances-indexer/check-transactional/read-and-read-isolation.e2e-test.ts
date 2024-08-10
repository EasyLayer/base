import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Observable } from 'rxjs';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/base';
import BitcoinBalancesIndexer from '@easylayer/plugin-bitcoin-balances-indexer';
import { BitcoinBalancesIndexerTransactionsBatchIndexedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { CustomEventBus, ofType, CqrsModule, UnhandledExceptionBus } from '@easylayer/core/cqrs';
import { SQLiteService } from '../../+helpers/sqlite/sqlite.service';
import { cleanDataFolder } from '../../+helpers/clean-data-folder';
import { mockBlocks } from './mocks/one-block';
import { TransactionsBatchModelFactoryService } from '@easylayer/plugin-bitcoin-balances-indexer/dist/domain-layer/services';

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

describe('/Check Transactional Isolation Between Read and Read States', () => {
  let app: INestApplication;
  let dbService: SQLiteService;
  let eventBus: CustomEventBus;
  let transactionsBatchModelFactoryService: TransactionsBatchModelFactoryService;

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
    transactionsBatchModelFactoryService = app.get(TransactionsBatchModelFactoryService);

    jest
      .spyOn(transactionsBatchModelFactoryService['batchesRepository'], 'fetchLastEvent')
      .mockImplementationOnce(() => {
        return new BitcoinBalancesIndexerTransactionsBatchIndexedEvent({
          aggregateId: '462ee70e-9fd1-4f37-8298-425a1316121e',
          requestId: '0b0b5129-e471-4baa-91fc-ef1f9d83c87b',
          blockHeight: '0',
          batch: {
            tx: {
              '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b': {
                outputs: {
                  '0': {
                    address:
                      '04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f',
                    value: 50,
                  },
                },
                inputs: [
                  {
                    txid: null,
                    vout: null,
                    coinbase:
                      '04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73',
                  },
                ],
              },
            },
            n: 0,
            isFinalBatch: true,
          },
          status: 'indexed',
        });
      })
      .mockImplementationOnce(() => {
        return new BitcoinBalancesIndexerTransactionsBatchIndexedEvent({
          aggregateId: 'bcf1534d-9e46-450c-8532-2beabbc016c6',
          requestId: '503c1556-5d4f-4e7e-b935-c071fc102e47',
          blockHeight: '1',
          batch: {
            tx: {
              f0315ffc38709d70ad5647e22048358dd3745f3ce3874223c80a7c92fab0c8ba: {
                outputs: {
                  '0': { address: '021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51', value: 50 },
                },
                inputs: [{ txid: null, vout: null, coinbase: '0420e7494d017f062f503253482f' }],
              },
            },
            n: 0,
            isFinalBatch: true,
          },
          status: 'indexed',
        });
      })
      .mockImplementationOnce(() => {
        // IMPORTANAT: this event will throw an error
        return new BitcoinBalancesIndexerTransactionsBatchIndexedEvent({
          aggregateId: '4b25b959-f9fd-402b-8a25-f0c2ad4dd317',
          requestId: 'bccc5ff8-3535-4a85-aeca-81271c7f0611',
          blockHeight: '16',
          batch: {},
          status: 'indexed',
        });
      });

    await transactionsBatchModelFactoryService.publishLastEvent('462ee70e-9fd1-4f37-8298-425a1316121e');
    await transactionsBatchModelFactoryService.publishLastEvent('bcf1534d-9e46-450c-8532-2beabbc016c6');
    await transactionsBatchModelFactoryService.publishLastEvent('4b25b959-f9fd-402b-8a25-f0c2ad4dd317');

    const createEventPromise = (eventType: any, expectedCount: number): Promise<void> => {
      return new Promise<void>((resolve) => {
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
          // In these tests we get the expected error here,
          // so to prevent the failing of tests we put resolve() here
          error: () => resolve(),
        });
      });
    };

    await createEventPromise(BitcoinBalancesIndexerTransactionsBatchIndexedEvent, 3);
    await app.close();
  });

  it('should only save two events correctly', async () => {
    dbService = new SQLiteService({ path: resolve(process.cwd(), 'easylayer/data/balances-indexer-read.db') });
    dbService.connect();

    // Fetch outputs from the database
    const outputs = await dbService.all(`
      SELECT * 
      FROM outputs
    `);

    // Check that the outputs length
    // It should be 4,
    // In our coinbase database, the outputs are duplicated,
    // so there should be 4 outputs from two events
    // (just without the third event where the transaction should have been rolled back)
    expect(outputs.length).toBe(4);
  });
});
