import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource, DataSourceOptions } from 'typeorm';

type ReadDatabaseModuleConfig = TypeOrmModuleOptions & {
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  name: string;
  entities: Function[];
};

@Module({})
export class ReadDatabaseModule {
  static forRoot(config: ReadDatabaseModuleConfig): DynamicModule {
    const { name, entities = [], ...restOptions } = config;

    // TODO: remove from here
    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), 'data', `${name}.db`) : name;

    return {
      module: ReadDatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          name,
          useFactory: () => ({
            ...restOptions,
            database,
            entities,
          }),
          dataSourceFactory: async (options?: DataSourceOptions) => {
            if (!options) {
              throw new Error('Invalid options passed');
            }
            // Add a DataSource with a unique name
            return addTransactionalDataSource({
              name,
              dataSource: new DataSource(options),
            });
          },
        }),
        // 
        TypeOrmModule.forFeature(entities, name),
      ],
      providers: [],
      exports: [TypeOrmModule],
    };
  }
}
