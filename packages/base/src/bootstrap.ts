import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DynamicModule, INestApplication } from '@nestjs/common';
import { NestLogger } from '@easylayer/components/logger';
import { CoreModule } from './core.module';
import { AppConfig } from './config';
import { setupSwaggerServer, importPlugins } from './utils';

// IMPORTANT: we use dotenv here to load envs globaly.
// It have to be before import all plugins.
config({ path: resolve(process.cwd(), `easylayer/.env`) });

export interface RegisterablePlugin {
  register: () => DynamicModule | Promise<DynamicModule>;
}

export interface BootstrapOptions {
  appName?: string;
  plugins?: RegisterablePlugin[];
  isAutoImportDisable?: boolean;
}

export const bootstrap = async ({
  appName = 'easylayer',
  plugins = [],
  isAutoImportDisable = false,
}: BootstrapOptions) => {
  const logger = new NestLogger();

  const externalPlugins = [];
  // TODO: move to external method
  for (const plugin of plugins) {
    try {
      const registeredPlugin = await plugin.register();
      externalPlugins.push(registeredPlugin);
    } catch (error) {
      logger.error(`Error importing plugins: ${error}`);
      process.exit(1);
    }
  }

  let internalPlugins: DynamicModule[] = [];

  if (!isAutoImportDisable) {
    const basePath = resolve(process.cwd());
    internalPlugins = await importPlugins(basePath);
  }

  // Create a root app module that already includes dynamic modules
  const rootModule = CoreModule.forRoot({
    appName: appName || 'easylayer starter',
    plugins: [...externalPlugins, ...internalPlugins],
  });

  // Create a Nest application
  const app = await NestFactory.create(rootModule, { logger });

  const appConfig = app.get(AppConfig);

  // app.useGlobalFilters(new ExceptionFilterMiddleware());

  if (appConfig.isDEVELOPMENT()) {
    setupSwaggerServer(app, {
      title: appName ? appName : 'default',
      description: 'Description',
    });
  }

  process.on('SIGINT', () => gracefulShutdown(app, logger));
  process.on('SIGTERM', () => gracefulShutdown(app, logger));

  const port = appConfig.PORT;
  await app.listen(port);
  logger.log(`Http server is listening on port ${port}`, 'NestApplication');
};

function gracefulShutdown(app: INestApplication, logger: NestLogger) {
  logger.log('Graceful shutdown initiated...');

  // IMPORTANT: Let's set the timeout to 0 ms
  // so that the completion occurs after all asynchronous operations.
  setTimeout(async () => {
    try {
      logger.log('Closing application...');
      await app.close();
    } catch (error) {
      logger.error('Error during shutdown');
      process.exit(1);
    } finally {
      logger.log('Application closed successfully.');
      process.exit(0);
    }
  }, 0);
}
