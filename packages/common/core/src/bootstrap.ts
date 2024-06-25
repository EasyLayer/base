import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DynamicModule } from '@nestjs/common';
import { NestLogger } from '@easylayer/logger';
import { initializeTransactionalContext } from '@easylayer/eventstore/transactional-hooks';
import { CoreModule } from './core.module';
import { AppConfig } from './config';
import { setupSwaggerServer } from './utils';

export interface RegisterablePlugin {
  register: () => DynamicModule | Promise<DynamicModule>;
}

export interface BootstrapOptions {
  appName?: string;
  plugins?: RegisterablePlugin[];
}

initializeTransactionalContext();

export const bootstrap = async ({ appName, plugins = [] }: BootstrapOptions) => {
  const logger = new NestLogger();

  // const basePath = resolve(process.cwd());

  // IMPORTANT: we use dotenv here to load envs globaly.
  // It have to be before import all plugins.
  config({ path: resolve(process.cwd(), '.env') });

  const externalPlugins = [];
  // TODO: move to external method
  for (const plugin of plugins) {
    const registeredPlugin = await plugin.register();
    externalPlugins.push(registeredPlugin);
  }

  // const internalPlugins = await importPlugins(basePath);

  // Create a root app module that already includes dynamic modules
  const rootModule = CoreModule.forRoot({
    appName: appName || 'easylayer starter',
    plugins: [...externalPlugins],
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

  const port = appConfig.PORT;
  await app.listen(port);
  logger.log(`Http server is listening on port ${port}`, 'NestApplication');
};
