import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { LoggerModule } from '@easylayer/components/logger';
import { OKMModule, Schema } from './okm';
import { ViewsKeyValueDatabaseService } from './views-keyvalue-db.service';

type ViewsKeyValueDatabaseModuleConfig = {
  path: string;
  type: 'rocksdb';
  name: string;
  schemas: Schema[];
};

@Module({})
export class ViewsKeyValueDatabaseModule {
  static forRoot(config: ViewsKeyValueDatabaseModuleConfig): DynamicModule {
    const { name, path, type, schemas } = config;

    // TODO: remove from here
    const database = type === 'rocksdb' ? resolve(process.cwd(), path) : name;

    return {
      module: ViewsKeyValueDatabaseModule,
      imports: [
        LoggerModule.forRoot({ componentName: 'ViewsKeyValueDatabaseComponent' }),
        OKMModule.forRoot({ database, type, schemas }),
      ],
      providers: [ViewsKeyValueDatabaseService],
      exports: [OKMModule, ViewsKeyValueDatabaseService],
    };
  }
}
