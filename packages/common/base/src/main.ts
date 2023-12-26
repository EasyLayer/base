import { NestFactory } from '@nestjs/core';
import { CoreModule } from '@easylayer/core';
import { NestLogger } from '@easylayer/logger';

export interface BootstrapOptions {
  appName?: string;
  plugins?: any[];
}

export const bootstrap = async ({ appName, plugins }: any) => {
  const logger = new NestLogger();

  const app = await NestFactory.create(
    CoreModule.forRoot({
      appName: appName || 'easylayer starter',
      plugins,
    }),
    {
      logger,
    }
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Http server is listening on port ${port}`, 'NestApplication');
};
