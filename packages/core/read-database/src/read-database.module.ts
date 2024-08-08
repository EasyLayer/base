import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ReadDatabaseService } from './read-database.service';

type ReadDatabaseModuleConfig = TypeOrmModuleOptions & {
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  name: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  entities: Function[];
};

@Module({})
export class ReadDatabaseModule {
  static forRoot(config: ReadDatabaseModuleConfig): DynamicModule {
    const { name, entities = [], ...restOptions } = config;

    // Initialize transactional context before setting up the database connections
    initializeTransactionalContext();

    // TODO: remove from here
    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), 'easylayer/data', `${name}.db`) : name;

    return {
      module: ReadDatabaseModule,
      imports: [
        // IMPORTANT: 'name' - is required everywhere and for convenience we indicate it the same
        // so as not to get confused. It must be unique to the one module connection.
        TypeOrmModule.forRootAsync({
          name,
          useFactory: () => ({
            ...restOptions,
            name,
            database,
            entities,
          }),
          dataSourceFactory: async (options?: DataSourceOptions) => {
            if (!options) {
              throw new Error('Invalid options passed');
            }
            const dataSource = new DataSource(options);
            await dataSource.initialize();

            // Add a DataSource with a unique name
            // IMPORTANT: name use in @Transactional() decorator
            addTransactionalDataSource({
              name,
              dataSource,
            });

            return dataSource;
          },
        }),
        //
        TypeOrmModule.forFeature(entities, name),
      ],
      providers: [
        {
          provide: ReadDatabaseService,
          useFactory: async (dataSource: DataSource) => {
            return new ReadDatabaseService(dataSource);
          },
          inject: [getDataSourceToken(name)],
        },
      ],
      exports: [TypeOrmModule, ReadDatabaseService],
    };
  }
}
