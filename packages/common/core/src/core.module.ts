import { DynamicModule, Module } from '@nestjs/common';

export interface CoreModuleOptions {
  wallets?: any[];
  parsers?: any[];
  exchanges?: any[];
  plugins?: any[];
  //...
}

@Module({})
export class CoreModule {
  static forRoot({}: CoreModuleOptions): DynamicModule {
    return {
      module: CoreModule,
      controllers: [],
      providers: [],
      exports: [],
    };
  }
}
