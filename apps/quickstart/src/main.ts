import { NestFactory } from '@nestjs/core';
import { CoreModule } from '@easylayer/core';
import { NestLogger } from '@easylayer/logger';

async function bootstrap() {
  const app = await NestFactory.create(
    CoreModule.forRoot({
      appName: 'quickstart',
    }),
    {
      logger: new NestLogger(),
    }
  );

  await app.listen(3000);
}
bootstrap();
