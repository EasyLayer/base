import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@easylayer/logger';
import { CoreService } from './core.service';

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
      providers: [CoreService],
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
