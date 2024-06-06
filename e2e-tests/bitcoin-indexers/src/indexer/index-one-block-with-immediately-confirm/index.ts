import 'reflect-metadata';
import { resolve, join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '@easylayer/core';
import BitcoinIndexer, { BlocksQueueService } from '@easylayer/plugin-bitcoin-indexer';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import { config } from 'dotenv';
import supertest from 'supertest';
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

// describe('/Initialization Bitcoin Indexer', () => {
//   let app: INestApplication;
//   let blocksQueueService: BlocksQueueService;

//   beforeAll(async () => {
//     // Clear the database
//     const dataDir = resolve(process.cwd(), 'src/indexer/database');
//     try {
//       const files = await readdir(dataDir);
//       const unlinkPromises = files.map(file => unlink(join(dataDir, file)));
//       await Promise.all(unlinkPromises);
//     } catch (err) {
//       console.error('Failed to clean data directory', err);
//     }

//     // Initialize transactional context before any database interaction
//     initializeTransactionalContext();
    
//     // Load environment variables
//     config({ path: resolve(process.cwd(), 'src/indexer/init-flow/.env') });

//     const indexer = await BitcoinIndexer.register();

//     const rootModule = CoreModule.forRoot({
//       appName: 'bitcoin-indexer-test',
//       plugins: [indexer],
//     });

//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [rootModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();

//     blocksQueueService = app.get(BlocksQueueService);

//     await app.init();
//   });

//   beforeEach(async () => {
//     await blocksQueueService.startBlocksLoading(0); // Запускаем загрузку блоков

//     // Ждем завершения загрузки блоков
//     while (blocksQueueService.isLoading) {
//       await new Promise(resolve => setTimeout(resolve, 100)); // Проверяем каждые 100 мс
//     }
//   });

  // it('/healthcheck (GET)', async () => {
  //   await supertest(app.getHttpServer())
  //     .get('/bitcoin-indexer/healthcheck')
  //     .expect(200);
  // });

//   afterAll(async () => {
//     if (app) {
//       try {
//         await app.close();
//       } catch(error) {
//         console.error(error)
//       }
//     }
//   });
// });
