import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestLogger } from '@easylayer/logger';
import { CoreModule } from './core.module';
import { AppConfig } from './config';
import { importPlugins, setupSwaggerServer } from './utils';

export interface BootstrapOptions {
  appName?: string;
}

export const bootstrap = async ({ appName }: BootstrapOptions) => {
  const logger = new NestLogger();

  const basePath = path.resolve(process.cwd());
  const plugins = await importPlugins(basePath);

  // Create a root app module that already includes dynamic modules
  const rootModule = CoreModule.forRoot({
    appName: appName || 'easylayer starter',
    plugins,
  });

  // Create a Nest application
  const app = await NestFactory.create(rootModule, { logger });

  const appConfig = app.get(AppConfig);

  if (appConfig.NODE_ENV === 'development') {
    setupSwaggerServer(app, {
      title: appName ? appName : 'default',
      description: 'Description',
    });
  }

  const port = appConfig.PORT;
  await app.listen(port);
  logger.log(`Http server is listening on port ${port}`, 'NestApplication');
};
