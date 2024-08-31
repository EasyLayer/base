import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DynamicModule, INestApplication, INestApplicationContext } from '@nestjs/common';
import { NestLogger, logger } from '@easylayer/components/logger';
import { BitcoinLoaderModule } from './bitcoin-loader.module';
import { AppConfig } from './config';
import { MapperType, EntitySchema } from './protocol';

interface BootstrapOptions {
  appName?: string;
  schemas: EntitySchema[];
  mapper: MapperType;
  isServer?: boolean;
}

export const bootstrap = async ({
  appName = 'bitcoin-loader',
  schemas,
  mapper,
  isServer = false,
}: BootstrapOptions) => {
  // IMPORTANT: we use dotenv here to load envs globally.
  // It has to be before importing all plugins.
  config({ path: resolve(process.cwd(), `${appName}/.env`) });

  const nestLogger = new NestLogger();
  logger(appName);

  try {
    const rootModule = await BitcoinLoaderModule.register({
      appName,
      schemas,
      mapper,
    });

    if (isServer) {
      await startHttpServer(rootModule, nestLogger);
    } else {
      await initializeApplicationContext(rootModule, nestLogger);
    }
  } catch (error) {
    nestLogger.error(`Bootstrap failed: ${error}`);
    process.exit(1);
  }
};

const startHttpServer = async (rootModule: DynamicModule, nestLogger: NestLogger) => {
  const app = await NestFactory.create(rootModule, { logger: nestLogger });
  const appConfig = app.get(AppConfig);
  const port = appConfig.PORT;

  await app.listen(port);
  nestLogger.log(`HTTP server is listening on port ${port}`, 'NestApplication');
  setupGracefulShutdownHandlers(app, nestLogger);
};

const initializeApplicationContext = async (rootModule: DynamicModule, nestLogger: NestLogger) => {
  const appContext = await NestFactory.createApplicationContext(rootModule, { logger: nestLogger });
  await appContext.init();
  setupGracefulShutdownHandlers(appContext, nestLogger);
};

const setupGracefulShutdownHandlers = (app: INestApplicationContext | INestApplication, nestLogger: NestLogger) => {
  process.on('SIGINT', () => gracefulShutdown(app, nestLogger));
  process.on('SIGTERM', () => gracefulShutdown(app, nestLogger));
};

const gracefulShutdown = (app: INestApplication | INestApplicationContext, logger: NestLogger) => {
  logger.log('Graceful shutdown initiated...');

  // IMPORTANT: Let's set the timeout to 0 ms
  // so that the completion occurs after all asynchronous operations.
  setTimeout(async () => {
    try {
      logger.log('Closing application...');
      // TODO: add close databases separatly (in sqlite case clear wal journal)
      // const eventstore = app.get(EventStore);
      await app.close();
    } catch (error) {
      logger.error('Error during shutdown');
      process.exit(1);
    } finally {
      logger.log('Application closed successfully.');
      process.exit(0);
    }
  }, 0);
};
