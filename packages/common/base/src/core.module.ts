import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@easylayer/logger';
import { CoreService } from './core.service';
import { AppConfig, appEnvs, DbConfig, dbEnvs } from './config';

export interface CoreModuleOptions {
  appName?: string;
  plugins: DynamicModule[];
  //...
}

@Module({})
export class CoreModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  static forRoot({ appName, plugins }: CoreModuleOptions): DynamicModule {
    return {
      module: CoreModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({ name: appName, componentName: 'CoreModule' }),
        ...plugins,
      ],
      controllers: [],
      providers: [
        CoreService,
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, appEnvs),
        },
        {
          provide: DbConfig,
          useValue: transformAndValidateSync(DbConfig, dbEnvs),
        },
      ],
      exports: [],
    };
  }

  async onModuleInit() {
    const coreService = this.moduleRef.get(CoreService, { strict: false });

    if (coreService) {
      coreService.test();
    }
  }
}
