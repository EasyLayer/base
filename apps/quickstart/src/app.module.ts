import * as path from 'path';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@easylayer/logger';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(__dirname, '../.env'),
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      componentName: 'AppModule',
    }),
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly service: AppService) {}

  onModuleInit() {
    this.service.test();
  }
}
