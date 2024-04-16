import { transformAndValidateSync } from 'class-transformer-validator';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@easylayer/logger';
import { CqrsModule } from '@easylayer/cqrs';
import { CqrsTransportModule } from '@easylayer/cqrs-transport';
import { CoreController } from './core.controller';
import { AppConfig, DbConfig } from './config';

export interface CoreModuleOptions {
  appName?: string;
  plugins: DynamicModule[];
  //...
}

@Module({})
export class CoreModule {
  constructor() {}

  static forRoot({ appName, plugins }: CoreModuleOptions): DynamicModule {
    return {
      module: CoreModule,
      imports: [
        LoggerModule.forRoot({ name: appName, componentName: 'CoreModule' }),
        CqrsModule.forRoot({ isGlobal: true }),
        CqrsTransportModule,
        ...plugins,
      ],
      controllers: [CoreController],
      providers: [
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env, {
            transformer: { enableImplicitConversion: true },
            validator: { whitelist: true },
          }),
        },
        {
          provide: DbConfig,
          useValue: transformAndValidateSync(DbConfig, process.env, {
            transformer: { enableImplicitConversion: true },
            validator: { whitelist: true },
          }),
        },
      ],
      exports: [],
    };
  }
}
