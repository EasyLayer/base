import { transformAndValidateSync } from 'class-transformer-validator';
import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@easylayer/core/cqrs';
import { CqrsTransportModule } from '@easylayer/core/cqrs-transport';
import { NetworkTransportModule } from '@easylayer/core/network-transport';
import { LoggerModule } from '@easylayer/components/logger';
import { CoreController } from './core.controller';
import { AppConfig } from './config';

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
        CqrsTransportModule.forRoot({ isGlobal: true }),
        CqrsModule.forRoot({ isGlobal: true }),
        NetworkTransportModule,
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
      ],
      exports: [],
    };
  }
}
