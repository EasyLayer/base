import { DynamicModule, Module } from '@nestjs/common';
import { logger, AppLogger } from './app-logger.service';

interface LoggerModuleOptions {
  name?: string;
  componentName: string;
}

@Module({})
export class LoggerModule {
  static forRoot({ name, componentName }: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: AppLogger,
          useValue: logger(name).child(componentName),
        },
      ],
      exports: [AppLogger],
    };
  }
}
