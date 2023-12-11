import { NestFactory } from '@nestjs/core';
import { NestLogger } from '@easylayer/logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new NestLogger(),
  });

  await app.listen(3000);
}
bootstrap();
