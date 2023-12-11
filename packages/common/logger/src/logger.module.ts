import { DynamicModule, Module } from '@nestjs/common';
import { logger, AppLogger } from './app-logger.service';

interface LoggerModuleOptions {
  componentName: string;
}

@Module({})
export class LoggerModule {
  static forRoot({ componentName }: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: AppLogger,
          useValue: logger.child(componentName),
        },
      ],
      exports: [AppLogger],
    };
  }
}
